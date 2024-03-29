(function() {
  var DEBUG, RethinkDBESM, _, bb, crypto, fs, get_hash, moment, shasum,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  bb = require('bluebird');

  fs = require('fs');

  crypto = require('crypto');

  moment = require('moment');

  shasum = null;

  _ = require('lodash');

  DEBUG = process.env.DEBUG || false;

  get_hash = function(value) {
    shasum = crypto.createHash("sha256");
    shasum.update(value.toString());
    return shasum.digest("hex");
  };

  RethinkDBESM = (function() {
    function RethinkDBESM(orms, NamespaceDoestNotExist) {
      if (orms == null) {
        orms = {};
      }
      this.NamespaceDoestNotExist = NamespaceDoestNotExist;
      this._r = orms.r;
      this._DURABILITY = orms.durability || "soft";
      this._CONFLICT = orms.conflict || "update";
      this._BATCH_SIZE = orms.batch_size || 500;
      this._READ_MODE = orms.read_mode || "outdated";
    }

    RethinkDBESM.prototype.try_create_db = function(db) {
      return this._r.dbCreate(db).run().then(function() {
        return true;
      })["catch"](function() {
        return true;
      });
    };

    RethinkDBESM.prototype.try_delete_db = function(db) {
      return this._r.dbDrop(db).run().then(function() {
        return true;
      })["catch"](function() {
        return true;
      });
    };

    RethinkDBESM.prototype.try_create_table = function(table, table_list) {
      if (indexOf.call(table_list, table) >= 0) {
        return bb["try"](function() {
          return false;
        });
      } else {
        return this._r.tableCreate(table).run().then(function() {
          return true;
        });
      }
    };

    RethinkDBESM.prototype.try_delete_table = function(table, table_list) {
      if (indexOf.call(table_list, table) >= 0) {
        return this._r.tableDrop(table).run().then(function(ret) {
          return true;
        });
      } else {
        return bb["try"](function() {
          return false;
        });
      }
    };

    RethinkDBESM.prototype.try_delete_namespace = function(namespace, table_list) {
      if (indexOf.call(table_list, 'namespaces') >= 0) {
        return this._r.table('namespaces').filter({
          namespace: namespace
        })["delete"]().run().then(function(ret) {
          return true;
        });
      } else {
        return bb["try"](function() {
          return false;
        });
      }
    };

    RethinkDBESM.prototype.destroy = function(namespace) {
      return this._r.tableList().run().then((function(_this) {
        return function(list) {
          return bb.all([_this.try_delete_table(namespace + "_events", list), _this.try_delete_namespace(namespace, list)]);
        };
      })(this));
    };

    RethinkDBESM.prototype.exists = function(namespace) {
      return this.list_namespaces().then((function(_this) {
        return function(list) {
          return indexOf.call(list, namespace) >= 0;
        };
      })(this));
    };

    RethinkDBESM.prototype.list_namespaces = function() {
      return this._r.table('namespaces').run().then(function(ret) {
        return ret.map(function(r) {
          return r.namespace;
        });
      });
    };

    RethinkDBESM.prototype.check_err = function(error) {
      if (error.message.indexOf("already exists on table") !== -1) {
        return true;
      } else {
        return false;
      }
    };

    RethinkDBESM.prototype.initialize = function(namespace) {
      return this._r.tableList().run().then((function(_this) {
        return function(list) {
          return bb.all([_this.try_create_table(namespace + "_events", list), _this.try_create_table("namespaces", list)]);
        };
      })(this)).spread((function(_this) {
        return function(events_created, schema_created) {
          var promises;
          if (schema_created) {
            console.log("table namespaces created ok");
          }
          if (events_created) {
            console.log("table " + namespace + "_events created ok");
            promises = [];
            promises = promises.concat([
              _this._r.table(namespace + "_events").indexCreate("created_at").run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("expires_at", _this._r.row("expires_at")["default"](false)).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person").run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_thing", [_this._r.row("person"), _this._r.row("thing")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_action", [_this._r.row("person"), _this._r.row("action")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_action_thing", [_this._r.row("person"), _this._r.row("action"), _this._r.row("thing")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_action_created_at", [_this._r.row("person"), _this._r.row("action"), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_created_at", [_this._r.row("person"), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_action_expires_at", [_this._r.row("person"), _this._r.row("action"), _this._r.row("expires_at")["default"](false)]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_thing_created_at", [_this._r.row("person"), _this._r.row("thing"), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_expires_at_created_at", [_this._r.row("person"), _this._r.row("expires_at")["default"](false), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("person_action_expires_at_created_at", [_this._r.row("person"), _this._r.row("action"), _this._r.row("expires_at")["default"](false), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("created_at_person_action_expires_at", [_this._r.row("created_at"), _this._r.row("person"), _this._r.row("action"), _this._r.row("expires_at")["default"](false)]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("thing_action", [_this._r.row("thing"), _this._r.row("action")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("thing_action_person_created_at", [_this._r.row("thing"), _this._r.row("action"), _this._r.row("person"), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("thing_action_created_at", [_this._r.row("thing"), _this._r.row("action"), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("thing_action_created_at_expires_at", [_this._r.row("thing"), _this._r.row("action"), _this._r.row("created_at"), _this._r.row("expires_at")["default"](false)]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("thing_created_at", [_this._r.row("thing"), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("action_created_at", [_this._r.row("action"), _this._r.row("created_at")]).run()["catch"](function(e) {
                return _this.check_err(e);
              }), _this._r.table(namespace + "_events").indexCreate("action").run()["catch"](function(e) {
                return _this.check_err(e);
              })
            ]);
            return bb.all(promises).then(function() {
              return _this._r.table(namespace + "_events").indexWait().run();
            });
          }
        };
      })(this)).then((function(_this) {
        return function() {
          return _this._r.table("namespaces").insert({
            id: get_hash(namespace),
            namespace: namespace
          }, {
            conflict: _this._CONFLICT
          });
        };
      })(this)).then(function() {
        return true;
      });
    };

    RethinkDBESM.prototype.convert_date = function(date) {
      var ret, valid_date;
      if (date) {
        date = new Date(date);
        if (date._isAMomentObject) {
          date = date.format();
        }
        valid_date = moment(date, moment.ISO_8601);
        if (valid_date.isValid()) {
          ret = date;
        } else {
          ret = this._r.ISO8601(date.toISOString());
        }
        return ret;
      } else {
        return null;
      }
    };

    RethinkDBESM.prototype.add_events = function(events) {
      var batch, created_at, e, expires_at, i, insert_attr, len, namespace, promises;
      promises = [];
      batch = [];
      if (events.length > 0) {
        namespace = events[0].namespace;
      }
      for (i = 0, len = events.length; i < len; i++) {
        e = events[i];
        created_at = this.convert_date(e.created_at) || this._r.ISO8601(new Date().toISOString());
        expires_at = this.convert_date(e.expires_at);
        insert_attr = {
          namespace: e.namespace,
          person: e.person,
          action: e.action,
          thing: e.thing,
          created_at: created_at,
          expires_at: expires_at
        };
        insert_attr.id = get_hash(e.person.toString() + e.action + e.thing);
        batch.push(insert_attr);
        if (batch.length > this._BATCH_SIZE) {
          promises.push(this.add_events_batch(batch));
          batch = [];
        }
      }
      if (batch.length > 0) {
        promises.push(this.add_events_batch(batch, namespace));
      }
      return bb.all(promises);
    };

    RethinkDBESM.prototype.add_events_batch = function(events, namespace) {
      if (events.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      return this._r.table(namespace + "_events").insert(events, {
        returnChanges: false,
        conflict: this._CONFLICT,
        durability: this._DURABILITY
      }).run()["catch"]((function(_this) {
        return function(error) {
          if (error.message.indexOf("Table") > -1 && error.message.indexOf("does not exist") > -1) {
            throw new _this.NamespaceDoestNotExist();
          }
        };
      })(this));
    };

    RethinkDBESM.prototype.add_event = function(namespace, person, action, thing, dates) {
      var created_at, expires_at;
      if (dates == null) {
        dates = {};
      }
      created_at = this.convert_date(dates.created_at) || this._r.ISO8601(new Date().toISOString());
      expires_at = this.convert_date(dates.expires_at);
      return this.add_event_to_db(namespace, person, action, thing, created_at, expires_at);
    };

    RethinkDBESM.prototype.add_event_to_db = function(namespace, person, action, thing, created_at, expires_at) {
      var insert_attr;
      if (expires_at == null) {
        expires_at = null;
      }
      insert_attr = {
        person: person,
        action: action,
        thing: thing,
        created_at: created_at,
        expires_at: expires_at
      };
      insert_attr.id = get_hash(person.toString() + action + thing);
      return this._r.table(namespace + "_events").insert(insert_attr, {
        returnChanges: false,
        conflict: this._CONFLICT,
        durability: this._DURABILITY
      }).run()["catch"]((function(_this) {
        return function(error) {
          if (error.message.indexOf("Table") > -1 && error.message.indexOf("does not exist") > -1) {
            throw new _this.NamespaceDoestNotExist();
          }
        };
      })(this));
    };

    RethinkDBESM.prototype.find_events = function(namespace, options) {
      var action, dt, index, index_fields, page, people, person, q, r, size, thing;
      if (options == null) {
        options = {};
      }
      options = _.defaults(options, {
        size: 50,
        page: 0,
        current_datetime: new Date()
      });
      r = this._r;
      if (options.time_until_expiry) {
        options.expires_after = moment(options.current_datetime).add(options.time_until_expiry, 'seconds').format();
      }
      size = options.size;
      page = options.page;
      people = options.people;
      person = options.person;
      action = options.action;
      thing = options.thing;
      if (people) {
        q = this._r.table(namespace + "_events");
        q = q.getAll.apply(q, slice.call(people).concat([{
          index: "person"
        }]));
        q = q.orderBy(this._r.desc('created_at'));
        if (DEBUG) {
          console.log("find_events query people -> ", q);
        }
        return q.run({
          readMode: this._READ_MODE
        });
      } else if (person && action && thing) {
        return this._event_selection(namespace, person, action, thing).run({
          readMode: this._READ_MODE
        }).then(function(e) {
          if (!e) {
            return [];
          }
          return [e];
        });
      } else {
        index = null;
        index_fields = null;
        if (person && action) {
          index = "person_action";
          index_fields = [person, action];
        } else if (person && thing) {
          index = "person_thing";
          index_fields = [person, thing];
        } else if (action && thing) {
          index = "thing_action";
          index_fields = [thing, action];
        } else if (person && !action && !thing) {
          index = "person";
          index_fields = [person];
        } else if (action && !person && !thing) {
          index = "action";
          index_fields = [action];
        } else if (thing && !action && !person) {
          index = "thing";
          index_fields = [thing];
        }
        dt = r.minval;
        if (options.expires_after) {
          dt = this.convert_date(options.expires_after);
          q = r.table(namespace + "_events").between(slice.call(index_fields).concat([dt], [r.minval]), slice.call(index_fields).concat([r.maxval], [this.convert_date(options.current_datetime)]), {
            index: index + '_expires_at_created_at'
          }).orderBy({
            index: r.desc(index + '_expires_at_created_at')
          }).slice(page * size, size * (page + 1));
        } else {
          q = r.table(namespace + "_events").between(slice.call(index_fields).concat([r.minval]), slice.call(index_fields).concat([this.convert_date(options.current_datetime)]), {
            index: index + '_created_at'
          }).orderBy({
            index: r.desc(index + '_created_at')
          }).slice(page * size, size * (page + 1));
        }
        if (DEBUG) {
          console.log("find_events query -> ", q);
        }
        return q.run({
          readMode: this._READ_MODE
        });
      }
    };

    RethinkDBESM.prototype.delete_events = function(namespace, options) {
      var action, person, thing;
      if (options == null) {
        options = {};
      }
      person = options.person;
      action = options.action;
      thing = options.thing;
      return this._event_selection(namespace, person, action, thing)["delete"]().run({
        durability: this._DURABILITY
      });
    };

    RethinkDBESM.prototype.count_events = function(namespace) {
      return this._r.table(namespace + "_events").count().run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype.estimate_event_count = function(namespace) {
      return this._r.table(namespace + "_events").count().run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype._event_selection = function(namespace, person, action, thing) {
      var index, index_fields, q, single_selection;
      single_selection = false;
      index = null;
      index_fields = null;
      if (person && action && thing) {
        single_selection = true;
      } else if (person && action) {
        index = "person_action";
        index_fields = [person, action];
      } else if (person && thing) {
        index = "person_thing";
        index_fields = [person, thing];
      } else if (action && thing) {
        index = "thing_action";
        index_fields = [thing, action];
      } else if (person && !action && !thing) {
        index = "person";
        index_fields = person;
      } else if (action && !person && !thing) {
        index = "action";
        index_fields = action;
      } else if (thing && !action && !person) {
        index = "thing";
        index_fields = thing;
      }
      q = this._r.table(namespace + "_events");
      if (single_selection) {
        q = q.get(get_hash(person.toString() + action + thing));
      } else if (index) {
        q = q.getAll(index_fields, {
          index: index
        });
        q = q.orderBy(this._r.desc('created_at'));
      }
      return q;
    };

    RethinkDBESM.prototype.thing_neighbourhood = function(namespace, thing, actions, options) {
      var a, q, r, thing_actions;
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
      options.expires_after = moment(options.current_datetime).add(options.time_until_expiry, 'seconds').format();
      r = this._r;
      thing_actions = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = actions.length; i < len; i++) {
          a = actions[i];
          results.push({
            thing: thing,
            action: a
          });
        }
        return results;
      })();
      q = r.expr(thing_actions).concatMap((function(_this) {
        return function(row) {
          return r.table(namespace + "_events").between([row("thing"), row("action"), r.minval, _this.convert_date(options.expires_after)], [row("thing"), row("action"), _this.convert_date(options.current_datetime), r.maxval], {
            index: 'thing_action_created_at_expires_at'
          }).orderBy({
            index: r.desc("thing_action_created_at_expires_at")
          });
        };
      })(this));
      q = q.limit(options.neighbourhood_search_size).concatMap((function(_this) {
        return function(row) {
          return r.expr(thing_actions).concatMap(function(row1) {
            return r.table(namespace + "_events").between([row("person"), row1('action'), r.minval], [row("person"), row1('action'), thing], {
              index: "person_action_thing",
              rightBound: 'open'
            }).union(r.table(namespace + "_events").between([row("person"), row1('action'), thing], [row("person"), row1('action'), r.maxval], {
              index: "person_action_thing",
              leftBound: 'open'
            }));
          });
        };
      })(this)).group("thing").ungroup().map((function(_this) {
        return function(row) {
          return {
            thing: row("group"),
            people: row("reduction").map(function(row) {
              return row('person');
            }).distinct(),
            last_actioned_at: row("reduction").map(function(row) {
              return row('created_at');
            }).max(),
            last_expires_at: row("reduction").map(function(row) {
              return row('expires_at');
            }).max(),
            count: row("reduction").count()
          };
        };
      })(this)).filter((function(_this) {
        return function(row) {
          return row('last_expires_at').ge(_this.convert_date(options.expires_after));
        };
      })(this)).orderBy(r.desc("count")).limit(options.neighbourhood_size);
      if (DEBUG) {
        console.log("thing_neighbourhood query -> ", q);
      }
      return q.run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype.cosine_distance = function(p1_values, p2_values) {
      var denominator_1, denominator_2, numerator, value, weight;
      if (!p1_values || !p2_values) {
        return 0;
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
      return numerator / (Math.sqrt(denominator_1) * Math.sqrt(denominator_2));
    };

    RethinkDBESM.prototype.get_cosine_distances = function(namespace, column1, column2, value, values, actions, limit, event_decay_rate, now) {
      var a, action_weights, bindings, i, len, obj, obj1, q, r, v, value_actions, weight;
      if (values.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      bindings = {
        value: value,
        now: now,
        event_decay_rate: event_decay_rate
      };
      r = this._r;
      action_weights = [];
      value_actions = [];
      for (a in actions) {
        weight = actions[a];
        action_weights.push({
          action: a,
          weight: weight
        });
        value_actions.push((
          obj = {},
          obj["" + column1] = value,
          obj["weight"] = weight,
          obj["action"] = a,
          obj
        ));
        for (i = 0, len = values.length; i < len; i++) {
          v = values[i];
          value_actions.push((
            obj1 = {},
            obj1["" + column1] = v,
            obj1["weight"] = weight,
            obj1["action"] = a,
            obj1
          ));
        }
      }
      q = r.expr(value_actions).concatMap((function(_this) {
        return function(row) {
          return r.table(namespace + "_events").between([row(column1), row("action"), r.minval], [row(column1), row("action"), _this.convert_date(now)], {
            index: column1 + "_action_created_at"
          }).orderBy({
            index: r.desc(column1 + "_action_created_at")
          }).limit(limit).innerJoin(r.expr(action_weights), function(row, actions) {
            return row('action').eq(actions('action'));
          }).zip().merge(function(row) {
            return {
              days_since: row('created_at').sub(_this.convert_date(now)).div(86400).round()
            };
          }).merge(r.js("( function(row) { return { weight:  row.weight * Math.pow(" + event_decay_rate + ", - Math.abs(row.days_since)) } } )")).group("person", "thing").max('weight').ungroup();
        };
      })(this)).map(function(row) {
        return row('reduction');
      }).group(column1).map(function(row) {
        return {
          value: row(column2),
          weight: row("weight")
        };
      }).ungroup();
      if (DEBUG) {
        console.log("get_cosine_distances query -> ", q);
      }
      return q.run({
        readMode: this._READ_MODE
      }).then((function(_this) {
        return function(ret) {
          var g, j, k, l, len1, len2, len3, red, ref, value_diffs;
          value_actions = {};
          for (j = 0, len1 = ret.length; j < len1; j++) {
            g = ret[j];
            value_actions[g.group] = {};
            ref = g.reduction;
            for (k = 0, len2 = ref.length; k < len2; k++) {
              red = ref[k];
              value_actions[g.group][red.value] = red.weight;
            }
          }
          value_diffs = {};
          for (l = 0, len3 = values.length; l < len3; l++) {
            v = values[l];
            value_diffs[v] = _this.cosine_distance(value_actions[value], value_actions[v]) || 0;
          }
          return value_diffs;
        };
      })(this));
    };

    RethinkDBESM.prototype._similarities = function(namespace, column1, column2, value, values, actions, options) {
      if (options == null) {
        options = {};
      }
      if (!actions || actions.length === 0 || values.length === 0) {
        return bb["try"](function() {
          return {};
        });
      }
      options = _.defaults(options, {
        similarity_search_size: 500,
        event_decay_rate: 1,
        current_datetime: new Date()
      });
      return this.get_cosine_distances(namespace, column1, column2, value, values, actions, options.similarity_search_size, options.event_decay_rate, options.current_datetime);
    };

    RethinkDBESM.prototype.calculate_similarities_from_thing = function(namespace, thing, things, actions, options) {
      if (options == null) {
        options = {};
      }
      return this._similarities(namespace, 'thing', 'person', thing, things, actions, options);
    };

    RethinkDBESM.prototype.person_neighbourhood = function(namespace, person, actions, options) {
      var a, expires_after, person_actions, q, r;
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
      expires_after = moment(options.current_datetime).add(options.time_until_expiry, 'seconds').format();
      r = this._r;
      q = r.table(namespace + "_events");
      person_actions = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = actions.length; i < len; i++) {
          a = actions[i];
          results.push({
            person: person,
            action: a
          });
        }
        return results;
      })();
      q = r.expr(person_actions).concatMap((function(_this) {
        return function(row) {
          return r.table(namespace + "_events").between([row('person'), row('action'), r.minval], [row('person'), row('action'), _this.convert_date(options.current_datetime)], {
            index: 'person_action_created_at'
          }).orderBy({
            index: r.desc("person_action_created_at")
          });
        };
      })(this));
      q = q.limit(options.neighbourhood_search_size);
      q = q.concatMap((function(_this) {
        return function(row) {
          return r.expr(person_actions).concatMap(function(row1) {
            return r.table(namespace + "_events").between([row("thing"), row1("action"), r.minval, r.minval], [row("thing"), row1("action"), r.maxval, _this.convert_date(options.current_datetime)], {
              index: 'thing_action_person_created_at'
            }).filter(function(row) {
              return row("person").ne(person);
            });
          });
        };
      })(this));
      q = q.group("person").ungroup().map((function(_this) {
        return function(row) {
          return {
            person: row("group"),
            count: row("reduction").count()
          };
        };
      })(this));
      q = q.filter((function(_this) {
        return function(row) {
          return r.expr(person_actions).concatMap(function(row1) {
            return r.table(namespace + "_events").between([row("person"), row1("action"), _this.convert_date(expires_after)], [row("person"), row1("action"), r.maxval], {
              index: 'person_action_expires_at'
            });
          }).group("person").ungroup().count().gt(0);
        };
      })(this));
      q = q.orderBy(r.desc("count")).limit(options.neighbourhood_size)("person");
      if (DEBUG) {
        console.log("person_neighbourhood query -> ", q);
      }
      return q.run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype.calculate_similarities_from_person = function(namespace, person, people, actions, options) {
      if (options == null) {
        options = {};
      }
      return this._similarities(namespace, 'person', 'thing', person, people, actions, options);
    };

    RethinkDBESM.prototype.filter_things_by_previous_actions = function(namespace, person, things, actions) {
      var action, i, indexes, len, q;
      if (!actions || actions.length === 0 || things.length === 0) {
        return bb["try"](function() {
          return things;
        });
      }
      indexes = [];
      for (i = 0, len = actions.length; i < len; i++) {
        action = actions[i];
        indexes.push([person, action]);
      }
      q = this._r(things).setDifference(this._r.table(namespace + "_events").getAll(this._r.args(indexes), {
        index: "person_action"
      }).coerceTo("ARRAY")("thing"));
      if (DEBUG) {
        console.log("filter_things_by_previous_actions query -> ", q);
      }
      return q.run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype.recent_recommendations_by_people = function(namespace, actions, people, options) {
      var a, expires_after, i, j, len, len1, p, people_actions, q, r;
      if (options == null) {
        options = {};
      }
      if (people.length === 0 || actions.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      options = _.defaults(options, {
        recommendations_per_neighbour: 10,
        time_until_expiry: 0,
        current_datetime: new Date()
      });
      expires_after = moment(options.current_datetime).add(options.time_until_expiry, 'seconds').format();
      r = this._r;
      people_actions = [];
      for (i = 0, len = people.length; i < len; i++) {
        p = people[i];
        for (j = 0, len1 = actions.length; j < len1; j++) {
          a = actions[j];
          people_actions.push({
            person: p,
            action: a
          });
        }
      }
      q = r.expr(people_actions).concatMap((function(_this) {
        return function(row) {
          return r.table(namespace + "_events").between([row('person'), row('action'), _this.convert_date(expires_after), r.minval], [row('person'), row('action'), r.maxval, _this.convert_date(options.current_datetime)], {
            index: 'person_action_expires_at_created_at',
            leftBound: 'closed',
            rightBound: 'closed'
          }).filter(function(row) {
            return row('created_at').le(_this.convert_date(options.current_datetime));
          }).orderBy(r.desc("created_at")).limit(options.recommendations_per_neighbour);
        };
      })(this)).group('person', 'thing').ungroup().map(function(row) {
        return {
          thing: row("group").nth(1),
          person: row("group").nth(0),
          last_actioned_at: row("reduction").map(function(row) {
            return row('created_at');
          }).max(),
          last_expires_at: row("reduction").map(function(row) {
            return row('expires_at');
          }).max()
        };
      }).orderBy(r.desc("last_actioned_at"));
      if (DEBUG) {
        console.log("recent_recommendations_by_people query -> ", q);
      }
      return q.run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype.pre_compact = function() {
      return bb["try"](function() {
        return true;
      });
    };

    RethinkDBESM.prototype.post_compact = function() {
      return bb["try"](function() {
        return true;
      });
    };

    RethinkDBESM.prototype.remove_non_unique_events_for_people = function(people) {
      return bb["try"](function() {
        return [];
      });
    };

    RethinkDBESM.prototype.remove_non_unique_events_for_person = function(people) {
      return bb["try"](function() {
        return [];
      });
    };

    RethinkDBESM.prototype.get_active_things = function(namespace) {
      var q;
      q = this._r.table(namespace + "_events").group('thing').count().ungroup().orderBy(this._r.desc('reduction')).limit(100)('group');
      if (DEBUG) {
        console.log("get_active_things query -> ", q);
      }
      return q.run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype.get_active_people = function(namespace) {
      var q;
      q = this._r.table(namespace + "_events").group('person').count().ungroup().orderBy(this._r.desc('reduction')).limit(100)('group');
      if (DEBUG) {
        console.log("get_active_people query -> ", q);
      }
      return q.run({
        readMode: this._READ_MODE
      });
    };

    RethinkDBESM.prototype.compact_people = function(namespace, compact_database_person_action_limit, actions) {
      return this.get_active_people(namespace).then((function(_this) {
        return function(people) {
          return _this.truncate_people_per_action(namespace, people, compact_database_person_action_limit, actions);
        };
      })(this));
    };

    RethinkDBESM.prototype.compact_things = function(namespace, compact_database_thing_action_limit, actions) {
      return this.get_active_things(namespace).then((function(_this) {
        return function(things) {
          return _this.truncate_things_per_action(namespace, things, compact_database_thing_action_limit, actions);
        };
      })(this));
    };

    RethinkDBESM.prototype.truncate_things_per_action = function(namespace, things, trunc_size, actions) {
      var action, i, j, len, len1, promises, thing;
      if (things.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      promises = [];
      for (i = 0, len = things.length; i < len; i++) {
        thing = things[i];
        for (j = 0, len1 = actions.length; j < len1; j++) {
          action = actions[j];
          promises.push(this._r.table(namespace + "_events").between([thing, action, this._r.minval], [thing, action, this._r.maxval], {
            index: "thing_action_created_at"
          }).orderBy(this._r.desc("thing_action_created_at")).skip(trunc_size)["delete"]().run({
            durability: this._DURABILITY
          }));
        }
      }
      return bb.all(promises);
    };

    RethinkDBESM.prototype.truncate_people_per_action = function(namespace, people, trunc_size, actions) {
      var action, i, j, len, len1, person, promises;
      if (people.length === 0) {
        return bb["try"](function() {
          return [];
        });
      }
      promises = [];
      for (i = 0, len = people.length; i < len; i++) {
        person = people[i];
        for (j = 0, len1 = actions.length; j < len1; j++) {
          action = actions[j];
          promises.push(this._r.table(namespace + "_events").between([person, action, this._r.minval], [person, action, this._r.maxval], {
            index: "person_action_created_at"
          }).orderBy({
            index: this._r.desc("person_action_created_at")
          }).skip(trunc_size)["delete"]().run({
            durability: this._DURABILITY
          }));
        }
      }
      return bb.all(promises);
    };

    RethinkDBESM.prototype.remove_events_till_size = function(namespace, number_of_events) {
      return this._r.table(namespace + "_events").orderBy({
        index: this._r.desc("created_at")
      }).skip(number_of_events)["delete"]().run({
        durability: this._DURABILITY
      });
    };

    return RethinkDBESM;

  })();

  module.exports = RethinkDBESM;

}).call(this);

//# sourceMappingURL=reco-rethinkdb.js.map
