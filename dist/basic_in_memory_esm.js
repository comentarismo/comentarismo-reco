(function() {
  var BasicInMemoryESM, Errors, _, bb, event_store, moment, person_action_store, thing_action_store,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  bb = require('bluebird');

  _ = require('lodash');

  moment = require('moment');

  event_store = {};

  person_action_store = {};

  thing_action_store = {};

  Errors = require('./errors');

  BasicInMemoryESM = (function() {
    function BasicInMemoryESM(options) {
      if (options == null) {
        options = {};
      }
    }

    BasicInMemoryESM.prototype.initialize = function(namespace) {
      event_store[namespace] || (event_store[namespace] = []);
      person_action_store[namespace] || (person_action_store[namespace] = {});
      thing_action_store[namespace] || (thing_action_store[namespace] = {});
      return bb["try"](function() {});
    };

    BasicInMemoryESM.prototype.destroy = function(namespace) {
      delete event_store[namespace];
      delete person_action_store[namespace];
      delete thing_action_store[namespace];
      return bb["try"](function() {});
    };

    BasicInMemoryESM.prototype.exists = function(namespace) {
      return bb["try"]((function(_this) {
        return function() {
          return !!event_store[namespace];
        };
      })(this));
    };

    BasicInMemoryESM.prototype.list_namespaces = function() {
      return bb["try"](function() {
        return Object.keys(event_store);
      });
    };

    BasicInMemoryESM.prototype.thing_neighbourhood = function(namespace, thing, actions, options) {
      var one_degree_away;
      if (options == null) {
        options = {};
      }
      if (!actions || actions.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      options = _.defaults(options, {
        neighbourhood_size: 100,
        neighbourhood_search_size: 500,
        time_until_expiry: 0,
        current_datetime: new Date()
      });
      options.actions = actions;
      options.expires_after = moment(options.current_datetime).add(options.time_until_expiry, 'seconds').format();
      one_degree_away = this._one_degree_away(namespace, 'thing', 'person', thing, _.clone(options));
      one_degree_away = one_degree_away.filter(function(x) {
        return x.thing !== thing && !!x.last_expires_at && !moment(x.last_expires_at).isBefore(options.expires_after);
      });
      one_degree_away.map(function(x) {
        x.people = _.uniq(x.person);
        return delete x.person;
      });
      one_degree_away = _.sortBy(one_degree_away, function(x) {
        return -x.people.length;
      });
      return bb["try"](function() {
        return one_degree_away.slice(0, options.neighbourhood_size);
      });
    };

    BasicInMemoryESM.prototype.person_neighbourhood = function(namespace, person, actions, options) {
      var one_degree_away, query_hash, unexpired_events, x;
      if (options == null) {
        options = {};
      }
      if (!actions || actions.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      options = _.defaults(options, {
        neighbourhood_size: 100,
        neighbourhood_search_size: 500,
        time_until_expiry: 0,
        current_datetime: new Date()
      });
      options.actions = actions;
      options.expires_after = moment(options.current_datetime).add(options.time_until_expiry, 'seconds').format();
      one_degree_away = this._one_degree_away(namespace, 'person', 'thing', person, _.clone(options));
      query_hash = _.clone(options);
      query_hash.people = one_degree_away.map(function(x) {
        return x.person;
      });
      unexpired_events = (function() {
        var i, len, ref, results;
        ref = this._find_events(namespace, query_hash);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          x = ref[i];
          if (person !== x.person) {
            results.push(x.person);
          }
        }
        return results;
      }).call(this);
      return bb["try"](function() {
        return _.uniq(unexpired_events).slice(0, options.neighbourhood_size);
      });
    };

    BasicInMemoryESM.prototype._one_degree_away = function(namespace, column1, column2, value, options) {
      var i, j, len, len1, obj, ref, ref1, ret, search_hash, search_hash_1, search_hash_2, x, y;
      search_hash = {
        current_datetime: options.current_datetime,
        actions: options.actions,
        size: options.neighbourhood_search_size
      };
      search_hash_1 = _.clone(search_hash);
      search_hash_1[column1] = value;
      ret = {};
      ref = this._find_events(namespace, search_hash_1);
      for (i = 0, len = ref.length; i < len; i++) {
        x = ref[i];
        search_hash_2 = _.clone(search_hash);
        search_hash_2[column2] = x[column2];
        ref1 = this._find_events(namespace, search_hash_2);
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          y = ref1[j];
          if (ret[y[column1]] === void 0) {
            ret[y[column1]] = (
              obj = {},
              obj["" + column1] = y[column1],
              obj["" + column2] = [y[column2]],
              obj.last_actioned_at = y.created_at,
              obj.last_expires_at = y.expires_at,
              obj
            );
          } else {
            ret[y[column1]][column2].push(y[column2]);
            ret[y[column1]].last_actioned_at = moment.max(moment(ret[y[column1]].last_actioned_at), moment(y.created_at)).toDate();
            if (ret[y[column1]].last_expires_at === null) {
              ret[y[column1]].last_expires_at = y.expires_at;
            } else if (y.expires_at !== null) {
              ret[y[column1]].last_expires_at = moment.max(moment(ret[y[column1]].last_expires_at), moment(y.expires_at)).toDate();
            }
          }
        }
      }
      return _.values(ret);
    };

    BasicInMemoryESM.prototype._cosine_distance = function(namespace, column1, column2, v1, v2, actions, now, limit, event_decay_rate) {
      var cosinse_similarity, days, denominator_1, denominator_2, e, i, j, len, len1, n_weight, numerator, p1_values, p2_values, ref, ref1, search1, search2, value, weight;
      search1 = {
        current_datetime: now
      };
      search2 = {
        current_datetime: now
      };
      search1[column1] = v1;
      search2[column1] = v2;
      search1.actions = Object.keys(actions);
      search2.actions = Object.keys(actions);
      p1_values = {};
      ref = this._find_events(namespace, search1).slice(0, limit);
      for (i = 0, len = ref.length; i < len; i++) {
        e = ref[i];
        weight = actions[e.action];
        days = Math.round(moment.duration(moment(now).diff(e.created_at)).asDays());
        n_weight = weight * Math.pow(event_decay_rate, -days);
        p1_values[e[column2]] = n_weight;
      }
      p2_values = {};
      ref1 = this._find_events(namespace, search2).slice(0, limit);
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        e = ref1[j];
        weight = actions[e.action];
        days = Math.round(moment.duration(moment(now).diff(e.created_at)).asDays());
        n_weight = weight * Math.pow(event_decay_rate, -days);
        p2_values[e[column2]] = n_weight;
      }
      numerator = 0;
      for (value in p1_values) {
        weight = p1_values[value];
        if (p2_values[value]) {
          numerator += weight * p2_values[value];
        }
      }
      denominator_1 = 0;
      for (value in p1_values) {
        weight = p1_values[value];
        denominator_1 += Math.pow(weight, 2);
      }
      denominator_2 = 0;
      for (value in p2_values) {
        weight = p2_values[value];
        denominator_2 += Math.pow(weight, 2);
      }
      cosinse_similarity = numerator / (Math.sqrt(denominator_1) * Math.sqrt(denominator_2));
      return cosinse_similarity;
    };

    BasicInMemoryESM.prototype._similarities = function(namespace, column1, column2, value, values, actions, options) {
      var i, len, similarities, v;
      if (options == null) {
        options = {};
      }
      if (values.length === 0) {
        return bb["try"](function() {
          return {};
        });
      }
      options = _.defaults(options, {
        similarity_search_size: 500,
        current_datetime: new Date(),
        event_decay_rate: 1
      });
      similarities = {};
      for (i = 0, len = values.length; i < len; i++) {
        v = values[i];
        similarities[v] = this._cosine_distance(namespace, column1, column2, value, v, actions, options.current_datetime, options.similarity_search_size, options.event_decay_rate);
        similarities[v] = similarities[v] || 0;
      }
      return bb["try"](function() {
        return similarities;
      });
    };

    BasicInMemoryESM.prototype.calculate_similarities_from_person = function(namespace, person, people, actions, options) {
      if (options == null) {
        options = {};
      }
      return this._similarities(namespace, 'person', 'thing', person, people, actions, options);
    };

    BasicInMemoryESM.prototype.calculate_similarities_from_thing = function(namespace, person, people, actions, options) {
      if (options == null) {
        options = {};
      }
      return this._similarities(namespace, 'thing', 'person', person, people, actions, options);
    };

    BasicInMemoryESM.prototype._recent_events = function(namespace, column1, actions, values, options) {
      var all_events, event, events, group_by_person_thing, grouped_events, i, j, last_actioned_at, last_expires_at, len, len1, person, query_hash, thing, thing_events, v;
      if (options == null) {
        options = {};
      }
      if (values.length === 0 || actions.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      options = _.defaults(options, {
        recommendations_per_neighbour: 10,
        time_until_expiry: 0,
        current_datetime: new Date()
      });
      options.actions = actions;
      all_events = [];
      for (i = 0, len = values.length; i < len; i++) {
        v = values[i];
        query_hash = {
          actions: actions
        };
        query_hash[column1] = v;
        events = this._find_events(namespace, _.extend(query_hash, options)).slice(0, options.recommendations_per_neighbour);
        all_events = all_events.concat(events);
      }
      group_by_person_thing = {};
      for (j = 0, len1 = all_events.length; j < len1; j++) {
        event = all_events[j];
        if (!group_by_person_thing[event.person]) {
          group_by_person_thing[event.person] = {};
        }
        if (!group_by_person_thing[event.person][event.thing]) {
          group_by_person_thing[event.person][event.thing] = {};
        }
        last_actioned_at = group_by_person_thing[event.person][event.thing].last_actioned_at || event.created_at;
        last_actioned_at = moment.max(moment(last_actioned_at), moment(event.created_at)).toDate();
        last_expires_at = group_by_person_thing[event.person][event.thing].last_expires_at || event.expires_at;
        last_expires_at = moment.max(moment(last_expires_at), moment(event.expires_at)).toDate();
        group_by_person_thing[event.person][event.thing] = {
          person: event.person,
          thing: event.thing,
          last_actioned_at: last_actioned_at,
          last_expires_at: last_expires_at
        };
      }
      grouped_events = [];
      for (person in group_by_person_thing) {
        thing_events = group_by_person_thing[person];
        for (thing in thing_events) {
          event = thing_events[thing];
          grouped_events = grouped_events.concat(event);
        }
      }
      grouped_events = _.sortBy(grouped_events, function(x) {
        return -x.last_actioned_at.getTime();
      });
      return bb["try"](function() {
        return grouped_events;
      });
    };

    BasicInMemoryESM.prototype.recent_recommendations_by_people = function(namespace, actions, people, options) {
      return this._recent_events(namespace, 'person', actions, people, options);
    };

    BasicInMemoryESM.prototype._filter_things_by_previous_action = function(namespace, person, things, action) {
      return things.filter((function(_this) {
        return function(t) {
          return !person_action_store[namespace][person] || !person_action_store[namespace][person][action] || !person_action_store[namespace][person][action][t];
        };
      })(this));
    };

    BasicInMemoryESM.prototype.filter_things_by_previous_actions = function(namespace, person, things, actions) {
      var action, filtered_things, i, len;
      if (!actions || actions.length === 0 || things.length === 0) {
        return bb["try"](function() {
          return things;
        });
      }
      filtered_things = things;
      for (i = 0, len = actions.length; i < len; i++) {
        action = actions[i];
        filtered_things = _.intersection(filtered_things, this._filter_things_by_previous_action(namespace, person, things, action));
      }
      return bb["try"](function() {
        return filtered_things;
      });
    };

    BasicInMemoryESM.prototype.add_events = function(events) {
      var e, i, len, promises;
      promises = [];
      for (i = 0, len = events.length; i < len; i++) {
        e = events[i];
        promises.push(this.add_event(e.namespace, e.person, e.action, e.thing, {
          created_at: e.created_at,
          expires_at: e.expires_at
        }));
      }
      return bb.all(promises);
    };

    BasicInMemoryESM.prototype.add_event = function(namespace, person, action, thing, dates) {
      var base, base1, base2, base3, created_at, e, expires_at, found_event;
      if (dates == null) {
        dates = {};
      }
      if (!event_store[namespace]) {
        return bb["try"](function() {
          throw new Errors.NamespaceDoestNotExist();
        });
      }
      created_at = moment(dates.created_at || new Date()).toDate();
      expires_at = dates.expires_at ? moment(new Date(dates.expires_at)).toDate() : null;
      found_event = this._find_event(namespace, person, action, thing);
      if (found_event) {
        found_event.created_at = created_at > found_event.created_at ? created_at : found_event.created_at;
        found_event.expires_at = expires_at && expires_at > found_event.expires_at ? expires_at : found_event.expires_at;
      } else {
        e = {
          person: person,
          action: action,
          thing: thing,
          created_at: created_at,
          expires_at: expires_at
        };
        event_store[namespace].push(e);
        (base = person_action_store[namespace])[person] || (base[person] = {});
        (base1 = person_action_store[namespace][person])[action] || (base1[action] = {});
        person_action_store[namespace][person][action][thing] = e;
        (base2 = thing_action_store[namespace])[thing] || (base2[thing] = {});
        (base3 = thing_action_store[namespace][thing])[action] || (base3[action] = {});
        thing_action_store[namespace][thing][action][person] = e;
      }
      return bb["try"](function() {
        return true;
      });
    };

    BasicInMemoryESM.prototype.count_events = function(namespace) {
      return bb["try"]((function(_this) {
        return function() {
          return event_store[namespace].length;
        };
      })(this));
    };

    BasicInMemoryESM.prototype.estimate_event_count = function(namespace) {
      return bb["try"]((function(_this) {
        return function() {
          return event_store[namespace].length;
        };
      })(this));
    };

    BasicInMemoryESM.prototype._find_event = function(namespace, person, action, thing) {
      if (!person_action_store[namespace][person]) {
        return null;
      }
      if (!person_action_store[namespace][person][action]) {
        return null;
      }
      if (!person_action_store[namespace][person][action][thing]) {
        return null;
      }
      return person_action_store[namespace][person][action][thing];
    };

    BasicInMemoryESM.prototype._filter_event = function(e, options) {
      var add;
      if (!e) {
        return false;
      }
      add = true;
      if (moment(options.current_datetime).isBefore(e.created_at)) {
        add = false;
      }
      if (options.expires_after && (!e.expires_at || moment(e.expires_at).isBefore(options.expires_after))) {
        add = false;
      }
      if (options.people) {
        if (!_.contains(options.people, e.person)) {
          add = false;
        }
      }
      if (options.person) {
        if (options.person !== e.person) {
          add = false;
        }
      }
      if (options.actions) {
        if (!_.contains(options.actions, e.action)) {
          add = false;
        }
      }
      if (options.action) {
        if (options.action !== e.action) {
          add = false;
        }
      }
      if (options.things) {
        if (!_.contains(options.things, e.thing)) {
          add = false;
        }
      }
      if (options.thing) {
        if (options.thing !== e.thing) {
          add = false;
        }
      }
      return add;
    };

    BasicInMemoryESM.prototype._find_events = function(namespace, options) {
      var at, ats, e, events, ref, ref1, ref2, t, thth;
      if (options == null) {
        options = {};
      }
      options = _.defaults(options, {
        size: 50,
        page: 0,
        current_datetime: new Date()
      });
      if (options.time_until_expiry !== void 0) {
        options.expires_after = moment(options.current_datetime).add(options.time_until_expiry, 'seconds').format();
      }
      events = [];
      if (options.person && options.action && options.thing) {
        e = (ref = person_action_store[namespace]) != null ? (ref1 = ref[options.person]) != null ? (ref2 = ref1[options.action]) != null ? ref2[options.thing] : void 0 : void 0 : void 0;
        events = [e];
      } else if (options.person && options.action) {
        events = (function() {
          var ref3, ref4, ref5, results;
          ref5 = (ref3 = person_action_store[namespace]) != null ? (ref4 = ref3[options.person]) != null ? ref4[options.action] : void 0 : void 0;
          results = [];
          for (t in ref5) {
            e = ref5[t];
            results.push(e);
          }
          return results;
        })();
      } else if (options.thing && options.action) {
        events = (function() {
          var ref3, ref4, ref5, results;
          ref5 = (ref3 = thing_action_store[namespace]) != null ? (ref4 = ref3[options.thing]) != null ? ref4[options.action] : void 0 : void 0;
          results = [];
          for (t in ref5) {
            e = ref5[t];
            results.push(e);
          }
          return results;
        })();
      } else if (options.person) {
        events = (function() {
          var ref3, ref4, results;
          ref4 = (ref3 = person_action_store[namespace]) != null ? ref3[options.person] : void 0;
          results = [];
          for (at in ref4) {
            ats = ref4[at];
            results.push((function() {
              var results1;
              results1 = [];
              for (t in ats) {
                e = ats[t];
                results1.push(e);
              }
              return results1;
            })());
          }
          return results;
        })();
      } else if (options.thing) {
        events = (function() {
          var ref3, ref4, results;
          ref4 = (ref3 = thing_action_store[namespace]) != null ? ref3[options.thing] : void 0;
          results = [];
          for (at in ref4) {
            ats = ref4[at];
            results.push((function() {
              var results1;
              results1 = [];
              for (t in ats) {
                e = ats[t];
                results1.push(e);
              }
              return results1;
            })());
          }
          return results;
        })();
      } else if (options.people) {
        events = (function() {
          var i, len, ref3, results;
          ref3 = options.people;
          results = [];
          for (i = 0, len = ref3.length; i < len; i++) {
            thth = ref3[i];
            results.push((function() {
              var ref4, ref5, results1;
              ref5 = (ref4 = person_action_store[namespace]) != null ? ref4[thth] : void 0;
              results1 = [];
              for (at in ref5) {
                ats = ref5[at];
                results1.push((function() {
                  var results2;
                  results2 = [];
                  for (t in ats) {
                    e = ats[t];
                    results2.push(e);
                  }
                  return results2;
                })());
              }
              return results1;
            })());
          }
          return results;
        })();
      } else if (options.things) {
        events = (function() {
          var i, len, ref3, results;
          ref3 = options.things;
          results = [];
          for (i = 0, len = ref3.length; i < len; i++) {
            thth = ref3[i];
            results.push((function() {
              var ref4, ref5, results1;
              ref5 = (ref4 = thing_action_store[namespace]) != null ? ref4[thth] : void 0;
              results1 = [];
              for (at in ref5) {
                ats = ref5[at];
                results1.push((function() {
                  var results2;
                  results2 = [];
                  for (t in ats) {
                    e = ats[t];
                    results2.push(e);
                  }
                  return results2;
                })());
              }
              return results1;
            })());
          }
          return results;
        })();
      } else {
        events = (function() {
          var i, len, ref3, results;
          ref3 = event_store[namespace];
          results = [];
          for (i = 0, len = ref3.length; i < len; i++) {
            e = ref3[i];
            results.push(e);
          }
          return results;
        })();
      }
      events = _.flatten(events, true);
      events = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = events.length; i < len; i++) {
          e = events[i];
          if (this._filter_event(e, options)) {
            results.push(e);
          }
        }
        return results;
      }).call(this);
      events = _.sortBy(events, function(x) {
        return -x.created_at.getTime();
      });
      events = events.slice(options.size * options.page, options.size * (options.page + 1));
      return events;
    };

    BasicInMemoryESM.prototype.find_events = function(namespace, options) {
      if (options == null) {
        options = {};
      }
      return bb["try"]((function(_this) {
        return function() {
          return _this._find_events(namespace, options);
        };
      })(this));
    };

    BasicInMemoryESM.prototype.pre_compact = function() {
      return bb["try"](function() {
        return true;
      });
    };

    BasicInMemoryESM.prototype._delete_events = function(namespace, events) {
      var e, i, len, results;
      event_store[namespace] = event_store[namespace].filter(function(x) {
        return indexOf.call(events, x) < 0;
      });
      results = [];
      for (i = 0, len = events.length; i < len; i++) {
        e = events[i];
        delete person_action_store[namespace][e.person][e.action][e.thing];
        results.push(delete thing_action_store[namespace][e.thing][e.action][e.person]);
      }
      return results;
    };

    BasicInMemoryESM.prototype.delete_events = function(namespace, options) {
      var events;
      if (options == null) {
        options = {};
      }
      events = this._find_events(namespace, {
        person: options.person,
        action: options.action,
        thing: options.thing
      });
      this._delete_events(namespace, events);
      return bb["try"]((function(_this) {
        return function() {
          return {
            deleted: events.length
          };
        };
      })(this));
    };

    BasicInMemoryESM.prototype.compact_people = function(namespace, limit, actions) {
      var action, action_store, events, i, len, marked_for_deletion, person, ref;
      marked_for_deletion = [];
      ref = person_action_store[namespace];
      for (person in ref) {
        action_store = ref[person];
        for (i = 0, len = actions.length; i < len; i++) {
          action = actions[i];
          events = this._find_events(namespace, {
            person: person,
            action: action
          });
          if (events.length > limit) {
            marked_for_deletion = marked_for_deletion.concat(events.slice(limit));
          }
        }
      }
      this._delete_events(namespace, marked_for_deletion);
      return bb["try"](function() {
        return true;
      });
    };

    BasicInMemoryESM.prototype.compact_things = function(namespace, limit, actions) {
      var action, action_store, events, i, len, marked_for_deletion, ref, thing;
      marked_for_deletion = [];
      ref = thing_action_store[namespace];
      for (thing in ref) {
        action_store = ref[thing];
        for (i = 0, len = actions.length; i < len; i++) {
          action = actions[i];
          events = this._find_events(namespace, {
            thing: thing,
            action: action
          });
          if (events.length > limit) {
            marked_for_deletion = marked_for_deletion.concat(events.slice(limit));
          }
        }
      }
      this._delete_events(namespace, marked_for_deletion);
      return bb["try"](function() {
        return true;
      });
    };

    BasicInMemoryESM.prototype.post_compact = function() {
      return bb["try"](function() {
        return true;
      });
    };

    return BasicInMemoryESM;

  })();

  module.exports = BasicInMemoryESM;

}).call(this);

//# sourceMappingURL=basic_in_memory_esm.js.map
