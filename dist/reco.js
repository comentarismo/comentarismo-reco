(function() {
  var RECO, _, bb, moment,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  bb = require('bluebird');

  _ = require('lodash');

  moment = require("moment");

  RECO = (function() {
    function RECO(esm) {
      this.esm = esm;
    }

    RECO.prototype.calculate_similarities_from_thing = function(namespace, thing, things, actions, configuration) {
      return this.esm.calculate_similarities_from_thing(namespace, thing, things, actions, _.clone(configuration));
    };

    RECO.prototype.calculate_similarities_from_person = function(namespace, person, people, actions, configuration) {
      return this.esm.calculate_similarities_from_person(namespace, person, people, actions, _.clone(configuration)).then((function(_this) {
        return function(similarities) {
          similarities[person] = 1;
          return similarities;
        };
      })(this));
    };

    RECO.prototype.filter_recommendations = function(namespace, person, recommendations, filter_previous_actions) {
      var recommended_things, x;
      recommended_things = _.uniq((function() {
        var i, len, results;
        results = [];
        for (i = 0, len = recommendations.length; i < len; i++) {
          x = recommendations[i];
          results.push(x.thing);
        }
        return results;
      })());
      return this.esm.filter_things_by_previous_actions(namespace, person, recommended_things, filter_previous_actions).then(function(filtered_recommendations) {
        var filtered_recs, i, len, rec, ref;
        filtered_recs = [];
        for (i = 0, len = recommendations.length; i < len; i++) {
          rec = recommendations[i];
          if (ref = rec.thing, indexOf.call(filtered_recommendations, ref) >= 0) {
            filtered_recs.push(rec);
          }
        }
        return filtered_recs;
      });
    };

    RECO.prototype.filter_similarities = function(similarities) {
      var ns, pt, weight;
      ns = {};
      for (pt in similarities) {
        weight = similarities[pt];
        if (weight !== 0) {
          ns[pt] = weight;
        }
      }
      return ns;
    };

    RECO.prototype.neighbourhood_confidence = function(n_values) {
      var pc;
      pc = 1.0 - Math.pow(Math.E, (-n_values) / 15);
      return pc;
    };

    RECO.prototype.history_confidence = function(n_history) {
      var hc;
      hc = 1.0 - Math.pow(Math.E, (-n_history) / 35);
      return hc;
    };

    RECO.prototype.recommendations_confidence = function(recommendations) {
      var i, len, mean_weight, r, tc, total_weight;
      if (recommendations.length === 0) {
        return 0;
      }
      total_weight = 0;
      for (i = 0, len = recommendations.length; i < len; i++) {
        r = recommendations[i];
        total_weight += r.weight;
      }
      mean_weight = total_weight / recommendations.length;
      tc = 1.0 - Math.pow(Math.E, (-mean_weight) / 2);
      return tc;
    };

    RECO.prototype.person_neighbourhood = function(namespace, person, actions, configuration) {
      return this.esm.person_neighbourhood(namespace, person, Object.keys(actions), _.clone(configuration));
    };

    RECO.prototype.thing_neighbourhood = function(namespace, thing, actions, configuration) {
      return this.esm.thing_neighbourhood(namespace, thing, Object.keys(actions), _.clone(configuration));
    };

    RECO.prototype.recent_recommendations_by_people = function(namespace, actions, people, configuration) {
      return this.esm.recent_recommendations_by_people(namespace, Object.keys(actions), people, _.clone(configuration));
    };

    RECO.prototype.calculate_people_recommendations = function(similarities, recommendations, configuration) {
      var i, len, rec, thing, thing_group;
      thing_group = {};
      for (i = 0, len = recommendations.length; i < len; i++) {
        rec = recommendations[i];
        if (thing_group[rec.thing] === void 0) {
          thing_group[rec.thing] = {
            thing: rec.thing,
            weight: 0,
            last_actioned_at: rec.last_actioned_at,
            last_expires_at: rec.last_expires_at,
            people: []
          };
        }
        thing_group[rec.thing].last_actioned_at = moment.max(moment(thing_group[rec.thing].last_actioned_at), moment(rec.last_actioned_at)).format();
        thing_group[rec.thing].last_expires_at = moment.max(moment(thing_group[rec.thing].last_expires_at), moment(rec.last_expires_at)).format();
        thing_group[rec.thing].weight += similarities[rec.person];
        thing_group[rec.thing].people.push(rec.person);
      }
      recommendations = [];
      for (thing in thing_group) {
        rec = thing_group[thing];
        recommendations.push(rec);
      }
      recommendations = recommendations.sort(function(x, y) {
        return y.weight - x.weight;
      });
      return recommendations;
    };

    RECO.prototype.calculate_thing_recommendations = function(thing, similarities, neighbourhood, configuration) {
      var i, len, rec, recommendations;
      recommendations = [];
      for (i = 0, len = neighbourhood.length; i < len; i++) {
        rec = neighbourhood[i];
        recommendations.push({
          thing: rec.thing,
          weight: rec.people.length * similarities[rec.thing],
          last_actioned_at: rec.last_actioned_at,
          last_expires_at: rec.last_expires_at,
          people: rec.people
        });
      }
      recommendations = recommendations.sort(function(x, y) {
        return y.weight - x.weight;
      });
      return recommendations;
    };

    RECO.prototype.generate_recommendations_for_person = function(namespace, person, actions, person_history_count, configuration) {
      return this.person_neighbourhood(namespace, person, actions, configuration).then((function(_this) {
        return function(people) {
          return bb.all([people, _this.calculate_similarities_from_person(namespace, person, people, actions, _.clone(configuration)), _this.recent_recommendations_by_people(namespace, actions, people.concat(person), _.clone(configuration))]);
        };
      })(this)).spread((function(_this) {
        return function(neighbourhood, similarities, recommendations) {
          return bb.all([neighbourhood, similarities, _this.filter_recommendations(namespace, person, recommendations, configuration.filter_previous_actions)]);
        };
      })(this)).spread((function(_this) {
        return function(neighbourhood, similarities, recommendations) {
          var history_confidence, neighbourhood_confidence, recommendations_confidence, recommendations_object;
          recommendations_object = {};
          recommendations_object.recommendations = _this.calculate_people_recommendations(similarities, recommendations, configuration);
          recommendations_object.neighbourhood = _this.filter_similarities(similarities);
          neighbourhood_confidence = _this.neighbourhood_confidence(neighbourhood.length);
          history_confidence = _this.history_confidence(person_history_count);
          recommendations_confidence = _this.recommendations_confidence(recommendations_object.recommendations);
          recommendations_object.confidence = neighbourhood_confidence * history_confidence * recommendations_confidence;
          return recommendations_object;
        };
      })(this));
    };

    RECO.prototype.generate_recommendations_for_thing = function(namespace, thing, actions, thing_history_count, configuration) {
      return this.thing_neighbourhood(namespace, thing, actions, configuration).then((function(_this) {
        return function(thing_neighbours) {
          var nei, things;
          things = (function() {
            var i, len, results;
            results = [];
            for (i = 0, len = thing_neighbours.length; i < len; i++) {
              nei = thing_neighbours[i];
              results.push(nei.thing);
            }
            return results;
          })();
          return bb.all([thing_neighbours, _this.calculate_similarities_from_thing(namespace, thing, things, actions, _.clone(configuration))]);
        };
      })(this)).spread((function(_this) {
        return function(neighbourhood, similarities) {
          var history_confidence, neighbourhood_confidence, recommendations_confidence, recommendations_object;
          recommendations_object = {};
          recommendations_object.recommendations = _this.calculate_thing_recommendations(thing, similarities, neighbourhood, configuration);
          recommendations_object.neighbourhood = _this.filter_similarities(similarities);
          neighbourhood_confidence = _this.neighbourhood_confidence(neighbourhood.length);
          history_confidence = _this.history_confidence(thing_history_count);
          recommendations_confidence = _this.recommendations_confidence(recommendations_object.recommendations);
          recommendations_object.confidence = neighbourhood_confidence * history_confidence * recommendations_confidence;
          return recommendations_object;
        };
      })(this));
    };

    RECO.prototype.default_configuration = function(configuration) {
      return _.defaults(configuration, {
        minimum_history_required: 1,
        neighbourhood_search_size: 100,
        similarity_search_size: 100,
        event_decay_rate: 1,
        neighbourhood_size: 25,
        recommendations_per_neighbour: 5,
        filter_previous_actions: [],
        time_until_expiry: 0,
        actions: {},
        current_datetime: new Date()
      });
    };

    RECO.prototype.normalize_actions = function(in_actions) {
      var action, actions, total_action_weight, weight;
      total_action_weight = 0;
      for (action in in_actions) {
        weight = in_actions[action];
        if (weight <= 0) {
          continue;
        }
        total_action_weight += weight;
      }
      actions = {};
      for (action in in_actions) {
        weight = in_actions[action];
        if (weight <= 0) {
          continue;
        }
        actions[action] = weight / total_action_weight;
      }
      return actions;
    };

    RECO.prototype.recommendations_for_thing = function(namespace, thing, configuration) {
      var actions;
      if (configuration == null) {
        configuration = {};
      }
      configuration = this.default_configuration(configuration);
      actions = configuration.actions;
      return this.find_events(namespace, {
        actions: Object.keys(actions),
        thing: thing,
        current_datetime: configuration.current_datetime,
        size: 100
      }).then((function(_this) {
        return function(events) {
          if (events.length < configuration.minimum_history_required) {
            return {
              recommendations: [],
              confidence: 0
            };
          }
          return _this.generate_recommendations_for_thing(namespace, thing, actions, events.length, configuration);
        };
      })(this));
    };

    RECO.prototype.recommendations_for_person = function(namespace, person, configuration) {
      var actions;
      if (configuration == null) {
        configuration = {};
      }
      configuration = this.default_configuration(configuration);
      actions = configuration.actions;
      return this.find_events(namespace, {
        actions: Object.keys(actions),
        person: person,
        current_datetime: configuration.current_datetime,
        size: 100
      }).then((function(_this) {
        return function(events) {
          if (events.length < configuration.minimum_history_required) {
            return {
              recommendations: [],
              confidence: 0
            };
          }
          return _this.generate_recommendations_for_person(namespace, person, actions, events.length, configuration);
        };
      })(this));
    };

    RECO.prototype.count_events = function(namespace) {
      return this.esm.count_events(namespace);
    };

    RECO.prototype.estimate_event_count = function(namespace) {
      return this.esm.estimate_event_count(namespace);
    };

    RECO.prototype.events = function(events) {
      return this.esm.add_events(events).then(function() {
        return events;
      });
    };

    RECO.prototype.event = function(namespace, person, action, thing, dates) {
      if (dates == null) {
        dates = {};
      }
      return this.esm.add_event(namespace, person, action, thing, dates).then(function() {
        return {
          person: person,
          action: action,
          thing: thing
        };
      });
    };

    RECO.prototype.find_events = function(namespace, options) {
      if (options == null) {
        options = {};
      }
      return this.esm.find_events(namespace, options);
    };

    RECO.prototype.delete_events = function(namespace, person, action, thing) {
      return this.esm.delete_events(namespace, person, action, thing);
    };

    RECO.prototype.namespace_exists = function(namespace) {
      return this.esm.exists(namespace);
    };

    RECO.prototype.list_namespaces = function() {
      return this.esm.list_namespaces();
    };

    RECO.prototype.initialize_namespace = function(namespace) {
      return this.esm.initialize(namespace);
    };

    RECO.prototype.destroy_namespace = function(namespace) {
      return this.esm.destroy(namespace);
    };

    RECO.prototype.compact_database = function(namespace, options) {
      if (options == null) {
        options = {};
      }
      options = _.defaults(options, {
        compact_database_person_action_limit: 1500,
        compact_database_thing_action_limit: 1500,
        actions: []
      });
      return this.esm.pre_compact(namespace).then((function(_this) {
        return function() {
          return _this.esm.compact_people(namespace, options.compact_database_person_action_limit, options.actions);
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.esm.compact_things(namespace, options.compact_database_thing_action_limit, options.actions);
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.esm.post_compact(namespace);
        };
      })(this));
    };

    RECO.prototype.compact_database_to_size = function(namespace, number_of_events) {
      return this.esm.remove_events_till_size(namespace, number_of_events);
    };

    return RECO;

  })();

  module.exports = RECO;

}).call(this);

//# sourceMappingURL=reco.js.map
