(function() {
  var Datastore, Errors, NAMESPACE, NamespaceDoestNotExist, PORT, ROUTES, Utils, _, bb, db, hapigerjs, ip, reco, util;

  Datastore = require('nedb');

  hapigerjs = require("hapigerjs");

  util = require('util');

  PORT = process.env.PORT || 3456;

  NAMESPACE = process.env.NAMESPACE || "comentarismo";

  bb = require('bluebird');

  _ = require("underscore");

  reco = require('./reco');

  Errors = require('./errors');

  NamespaceDoestNotExist = Errors.NamespaceDoestNotExist;

  Utils = {};

  Utils.resolveItems = (function(_this) {
    return function(namespace, result, count, cb) {
      var ns_thing, t;
      if (!result || !result.recommendations) {
        console.log("Error: resolveItems called with invalid input -> !result || !result.recommendations -> ", result);
        return cb(result);
      } else {
        t = result.recommendations[count];
        if (!t) {
          return cb(null, result);
        } else {
          ns_thing = t.thing;
          return bb.all([Items.get(ns_thing).run()]).spread(function(doc) {
            t.thing = doc.thing;
            t.id = doc.id;
            count = count + 1;
            return Utils.resolveItems(namespace, result, count, cb);
          })["catch"](thinky.Errors.ValidationError, function(err) {
            console.log("Validation Error: ", err.message);
            return Utils.resolveItems(namespace, result, count, cb);
          })["catch"](function(error) {
            console.log("Error: ", error.message);
            count = count + 1;
            return Utils.resolveItems(namespace, result, count, cb);
          });
        }
      }
    };
  })(this);

  Utils.GetNamespace = function(request) {
    if (request.query.namespace) {
      return request.query.namespace;
    } else {
      return NAMESPACE;
    }
  };

  db = {};

  ip = null;

  ROUTES = {
    register: function(plugin, options, next) {
      var default_configuration;
      reco = options.reco;
      global.thinky = require('thinky')({
        r: reco.esm._r
      });
      global.schema = require('../js/schema')(thinky);
      global.User = schema.User;
      global.Items = schema.Items;
      global.Likes = schema.Likes;
      default_configuration = options.default_configuration || {};
      require('dns').lookup(require('os').hostname(), function(err, add, fam) {
        console.log('addr: ' + add);
        return ip = "http://" + add + ":" + PORT + "/";
      });
      reco.initialize_namespace(NAMESPACE).then(function() {
        return console.log("Namespace started -> ", {
          namespace: NAMESPACE
        });
      })["catch"](function(err) {
        console.log("ERROR: Could not initialize namespace :O :O :O ... APP WILL EXIT -> ", NAMESPACE, err);
        return process.exit(1);
      });
      plugin.route({
        method: 'GET',
        path: '/',
        handler: (function(_this) {
          return function(request, reply) {
            var namespace;
            namespace = Utils.GetNamespace(request);
            return bb.all([User.limit(50).run(), Items.limit(50).run()]).spread(function(users, items) {
              return reply.view("index", {
                users: users,
                items: items,
                recommendations: []
              });
            })["catch"](function(error) {
              return reply({
                error: error
              }).code(500);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/health',
        handler: (function(_this) {
          return function(request, reply) {
            return reco.esm._r.db('rethinkdb').table('server_status').run().then(function(status) {
              return reply({
                status: status,
                ip: ip
              }).header("Access-Control-Allow-Origin", "*").header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            })["catch"](function(err) {
              return console.log("Error: ", err)(reply({
                error: err
              }).code(500));
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/clear',
        handler: (function(_this) {
          return function(request, reply) {
            return bb.all([User["delete"]().run(), Items["delete"]().run(), Likes["delete"]().run()]).spread(function(user, items, likes) {
              console.log("Removed  User, Items, Likes ", user, items, likes);
              return reply({
                status: "ok",
                ip: ip
              }).header("Access-Control-Allow-Origin", "*").header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            })["catch"](function(error) {
              return console.log("Error: ", err)(reply({
                error: error
              }).code(500));
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/{userId}/likes',
        handler: (function(_this) {
          return function(request, reply) {
            var userId;
            userId = request.params.userId;
            return bb.all([
              User.get(userId).getJoin({
                likes: true
              }).run()
            ]).spread(function(user) {
              return reply(user);
            })["catch"](thinky.Errors.ValidationError, function(err) {
              console.log("Validation Error: " + err.message);
              return reply({
                error: err
              }).code(500);
            })["catch"](function(error) {
              console.log("Error: ", err);
              return reply({
                error: error
              }).code(500);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/add',
        handler: (function(_this) {
          return function(request, reply) {
            var name, namespace, ns_user, user;
            name = request.query.name;
            namespace = Utils.GetNamespace(request);
            ns_user = name;
            if (name.indexOf(namespace) === -1) {
              ns_user = namespace + "_" + name;
            }
            user = new User({
              id: thinky.r.uuid(ns_user),
              name: name,
              namespace: namespace
            });
            return User.save(user, {
              conflict: 'update'
            }).then(function(result) {
              console.log("/users/add saved -> ", namespace, ns_user, result.id);
              return reply({
                message: "ok",
                "id": result.id
              });
            })["catch"](thinky.Errors.ValidationError, function(err) {
              console.log("Error: Validation -> ", namespace, ns_user, result.id, err.message);
              return reply({
                error: err
              }).code(500);
            })["catch"](function(err) {
              console.log("Error: ", err);
              return reply({
                error: err
              }).code(500);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/items/add',
        handler: function(request, reply) {
          var items, namespace, ns_thing, thing;
          thing = request.query.thing;
          namespace = Utils.GetNamespace(request);
          ns_thing = thing;
          if (thing.indexOf(namespace) === -1) {
            ns_thing = namespace + "_" + thing;
          }
          items = new Items({
            id: thinky.r.uuid(ns_thing),
            thing: thing,
            namespace: namespace
          });
          return Items.save(items, {
            conflict: 'update'
          }).then(function(result) {
            console.log("/items/add saved -> ", namespace, thing, result.id);
            return reply({
              message: "ok",
              "id": result.id
            });
          })["catch"](thinky.Errors.ValidationError, function(err) {
            console.log("Validation Error: " + err.message);
            return reply({
              error: err
            }).code(500);
          })["catch"](function(err) {
            console.log("Unexpected Error: " + err.message);
            console.log("Error: ", err);
            return reply({
              error: err
            }).code(500);
          });
        }
      });
      plugin.route({
        method: 'GET',
        path: '/users/{userId}/like/{itemId}',
        handler: (function(_this) {
          return function(request, reply) {
            var itemId, namespace, userId;
            userId = request.params.userId;
            itemId = request.params.itemId;
            namespace = Utils.GetNamespace(request);
            console.log("GET /users/" + userId + "/like/" + itemId);
            return bb.all([User.get(userId).run(), Items.get(itemId).run()]).spread(function(user, item) {
              var likes, msg;
              if (user && item) {
                likes = new Likes({
                  id: thinky.r.uuid(user.id + "_" + item.id),
                  namespace: namespace,
                  user: user,
                  items: item
                });
                return likes.saveAll({
                  user: true,
                  items: true
                }, {
                  conflict: 'update'
                }).then(function(result) {
                  console.log("==== likes.saveAll -> ", result.id);
                  return reco.events([
                    {
                      "namespace": namespace,
                      "person": user.id,
                      "action": "buy",
                      "thing": item.id,
                      "expires_at": "2017-03-30"
                    }
                  ]).then(function(events) {
                    var msg;
                    msg = util.format("User %s %s liked item %s %s", user.id, user.name, item.thing, item.id);
                    console.log("== LIKE ==");
                    console.log(msg);
                    console.log("==========");
                    return reply({
                      id: result.id,
                      message: msg
                    });
                  })["catch"](NamespaceDoestNotExist, function(err) {
                    console.log("ERROR: NamespaceDoestNotExist reco.events, ", err);
                    return Errors.handle_error(request, Boom.notFound("Namespace Not Found"), reply).code(500);
                  })["catch"](function(err) {
                    console.log("Error: reco.events, ", err);
                    return reply({
                      message: util.format("Something went wrong. When User %s liked item %s", userId, itemId)
                    }).code(500);
                  });
                })["catch"](thinky.Errors.ValidationError, function(err) {
                  console.log("Error: ValidationError db.likes.insert ", userId, itemId, err);
                  return reply({
                    error: err
                  }).code(500);
                })["catch"](function(error) {
                  console.log("Error: db.likes.insert ", userId, itemId, error);
                  return reply({
                    error: error
                  }).code(500);
                });
              } else {
                msg = util.format("Error: User %s already liked item %s", userId, itemId);
                console.log("== LIKE ==");
                console.log(msg);
                console.log("==========");
                return reply({
                  message: msg
                });
              }
            })["catch"](function(error) {
              console.log("Error:  db.likes.insert ", userId, itemId, error);
              return reply({
                error: error
              }).code(500);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/{userId}/recommend',
        handler: (function(_this) {
          return function(request, reply) {
            var configuration, namespace, userId;
            userId = request.params.userId;
            namespace = Utils.GetNamespace(request);
            configuration = _.defaults({
              "actions": {
                "view": 5,
                "buy": 10
              }
            }, default_configuration);
            return reco.recommendations_for_person(namespace, userId, configuration).then(function(result) {
              if (!result || result.length === 0) {
                console.log("== RECOMMEND ERROR ==");
                console.log("===============");
                return reply({
                  recommendations: []
                }).code(500);
              } else {
                console.log("== RECOMMEND USER OK ==");
                console.log("== length, ", result.recommendations.length);
                console.log("===============");
                return Utils.resolveItems(namespace, result, 0, function(err, resolved) {
                  if (err || !resolved) {
                    console.log("Could not execute resolveItems -> ", err);
                    return reply({
                      recommendations: result.recommendations
                    });
                  } else {
                    console.log("INFO: resolveItems for user length -> ", resolved.recommendations.length);
                    return reply({
                      recommendations: resolved.recommendations
                    });
                  }
                });
              }
            })["catch"](function(err) {
              console.error("Error: ", err);
              return reply({
                error: err
              }).code(500);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/thing/{thingId}/recommend',
        handler: (function(_this) {
          return function(request, reply) {
            var configuration, namespace, thingId;
            thingId = request.params.thingId;
            namespace = Utils.GetNamespace(request);
            configuration = _.defaults({
              "actions": {
                "view": 5,
                "buy": 10
              }
            }, default_configuration);
            return reco.recommendations_for_thing(namespace, thingId, configuration).then(function(result) {
              if (!result || result.length === 0) {
                console.log("== RECOMMEND ERROR ==");
                console.log("== ", thingId, result);
                console.log("===============");
                return reply({
                  recommendations: []
                });
              } else {
                console.log("== RECOMMEND THING OK ==");
                console.log("== length ", thingId, result.recommendations.length);
                console.log("===============");
                return Utils.resolveItems(namespace, result, 0, function(err, resolved) {
                  if (err || !resolved) {
                    console.log("Error: Could not execute resolveItems for thing -> ", err);
                    return reply({
                      recommendations: result.recommendations
                    });
                  } else {
                    console.log("INFO: resolveItems for thing length -> ", resolved.recommendations.length);
                    return reply({
                      recommendations: resolved.recommendations
                    });
                  }
                });
              }
            })["catch"](function(err) {
              console.error("Error: ", err);
              return reply({
                error: err
              }).code(500);
            });
          };
        })(this)
      });
      return next();
    }
  };

  ROUTES.register.attributes = {
    name: 'ROUTES',
    version: '1.0.0'
  };

  module.exports = ROUTES;

}).call(this);

//# sourceMappingURL=routes.js.map
