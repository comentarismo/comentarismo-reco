(function() {
  var Datastore, Errors, Items, Likes, NAMESPACE, NamespaceDoestNotExist, PORT, ROUTES, User, Utils, _, bb, db, hapigerjs, ip, reco, thinky, util;

  Datastore = require('nedb');

  hapigerjs = require("hapigerjs");

  util = require('util');

  PORT = process.env.PORT || 3456;

  NAMESPACE = process.env.NAMESPACE || "comentarismo";

  bb = require('bluebird');

  _ = require("underscore");

  reco = require('./reco');

  User = require('../js/schema').User;

  Items = require('../js/schema').Items;

  Likes = require('../js/schema').Likes;

  thinky = require('thinky')();

  Errors = require('./errors');

  NamespaceDoestNotExist = Errors.NamespaceDoestNotExist;

  Utils = {};

  Utils.handle_error = function(logger, err, reply) {
    console.log("handle_error -> ", err.stack);
    if (err.isBoom) {
      console.log('error', err);
      return reply(err);
    } else {
      console.log('error', {
        error: "" + err,
        stack: err.stack
      });
      return reply({
        error: "An unexpected error occurred"
      }).code(500);
    }
  };

  Utils.resolveItems = (function(_this) {
    return function(result, count, cb) {
      var t;
      if (!result || !result.recommendations) {
        console.log("Error: resolveItems called with invalid input -> !result || !result.recommendations -> ", result);
        return cb(result);
      } else {
        t = result.recommendations[count];
        if (!t) {
          return cb(null, result);
        } else {
          return db.items.findOne({
            _id: t.thing
          }, function(err, doc) {
            if (err || !doc) {
              console.log("Error: db.items.findOne, ", err);
              return cb(null, result);
            } else {
              t.thing = doc.thing;
              t._id = doc._id;
              console.log("Transformed thing -> ", t);
              count = count + 1;
              return Utils.resolveItems(result, count, cb);
            }
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
            return bb.all([User.run(), Items.run()]).spread(function(users, items) {
              return reply.view("index", {
                users: users,
                items: items,
                recommendations: []
              });
            })["catch"](thinky.Errors.ValidationError, function(err) {
              console.log("Validation Error: " + err.message);
              return reply({
                error: err
              });
            })["catch"](function(error) {
              return reply({
                error: error
              });
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/health',
        handler: (function(_this) {
          return function(request, reply) {
            var namespace;
            namespace = Utils.GetNamespace(request);
            return reply({
              status: "ok",
              ip: ip
            }).header("Access-Control-Allow-Origin", "*").header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/clear',
        handler: (function(_this) {
          return function(request, reply) {
            return bb.all([User["delete"]().run(), Items["delete"]().run(), Likes["delete"]().run()]).spread(function(user, item, like) {
              console.log("Removed  likes");
              return reply({
                status: "ok",
                ip: ip
              }).header("Access-Control-Allow-Origin", "*").header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            })["catch"](thinky.Errors.ValidationError, function(err) {
              return console.log("Validation Error: " + err.message)(reply({
                error: err
              }));
            })["catch"](function(error) {
              return reply({
                error: error
              });
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/{userId}/likes',
        handler: (function(_this) {
          return function(request, reply) {
            var namespace, userId;
            userId = request.params.userId;
            namespace = Utils.GetNamespace(request);
            return bb.all([User.get(userId).getJoin().run()]).spread(function(user) {
              return reply(user);
            })["catch"](thinky.Errors.ValidationError, function(err) {
              console.log("Validation Error: " + err.message);
              return reply({
                error: err
              });
            })["catch"](function(error) {
              return reply({
                error: error
              });
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/add',
        handler: (function(_this) {
          return function(request, reply) {
            var name, namespace, user;
            name = request.query.name;
            namespace = Utils.GetNamespace(request);
            console.log("Will save user -> ", name);
            user = new User({
              id: name,
              name: name
            });
            return User.save(user, {
              conflict: 'update'
            }).then(function(result) {
              return reply({
                message: "ok"
              });
            })["catch"](thinky.Errors.ValidationError, function(err) {
              console.log("Validation Error: " + err.message);
              return reply({
                error: err
              });
            })["catch"](function(error) {
              return reply({
                error: error
              });
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/items/add',
        handler: (function(_this) {
          return function(request, reply) {
            var items, namespace, thing;
            thing = request.query.thing;
            namespace = Utils.GetNamespace(request);
            items = new Items({
              id: thing,
              thing: thing
            });
            console.log("Will save thing -> ", thing);
            return Items.save(items, {
              conflict: 'update'
            }).then(function(result) {
              return reply({
                message: "ok"
              });
            })["catch"](thinky.Errors.ValidationError, function(err) {
              console.log("Validation Error: " + err.message);
              return reply({
                error: err
              });
            })["catch"](function(err) {
              console.log("Unexpected Error: " + err.message);
              return reply({
                error: err
              });
            });
          };
        })(this)
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
                  id: thinky.r.uuid(user.id + item.id)
                });
                likes.user = user;
                likes.items = item;
                return likes.saveAll({
                  user: true,
                  items: true
                }, {
                  conflict: 'update'
                }).then(function(result) {
                  console.log("db.likes.insert OK -> ", result);
                  return reco.events([
                    {
                      "namespace": namespace,
                      "person": userId,
                      "action": "buy",
                      "thing": itemId,
                      "expires_at": "2017-03-30"
                    }
                  ]).then(function(events) {
                    var msg;
                    msg = util.format("User %s liked item %s", userId, itemId);
                    console.log("== LIKE ==");
                    console.log(events, msg);
                    console.log("==========");
                    return reply({
                      message: msg
                    });
                  })["catch"](Utils.NamespaceDoestNotExist, function(err) {
                    console.log("ERROR: POST create event, ", err);
                    return Utils.handle_error(request, Boom.notFound("Namespace Not Found"), reply);
                  })["catch"](function(err) {
                    console.log("Error: ", err);
                    return reply({
                      message: util.format("Something went wrong. When User %s liked item %s", userId, itemId)
                    });
                  });
                })["catch"](thinky.Errors.ValidationError, function(err) {
                  console.log("Error:  db.likes.insert ", userId, itemId);
                  return reply({
                    error: err
                  });
                })["catch"](function(error) {
                  console.log("Error:  db.likes.insert ", userId, itemId);
                  return reply({
                    error: error
                  });
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
              console.log("Error:  db.likes.insert ", userId, itemId);
              return reply({
                error: error
              });
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/{userId}/recommend',
        handler: (function(_this) {
          return function(request, reply) {
            var configuration, namespace, person, userId;
            userId = request.params.userId;
            namespace = Utils.GetNamespace(request);
            person = userId;
            configuration = _.defaults({
              "actions": {
                "view": 5,
                "buy": 10
              }
            }, default_configuration);
            return reco.recommendations_for_person(namespace, person, configuration).then(function(result) {
              if (!result || result.length === 0) {
                console.log("== RECOMMEND ERROR ==");
                console.log("===============");
                return reply({
                  recommendations: []
                });
              } else {
                console.log("== RECOMMEND USER OK ==");
                console.log(result);
                console.log("===============");
                return Utils.resolveItems(result, 0, function(err, resolved) {
                  if (err || !resolved) {
                    console.log("Could not execute resolveItems -> ", err);
                    return reply({
                      recommendations: result.recommendations
                    });
                  } else {
                    console.log("INFO: resolveItems, ", resolved);
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
              });
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/thing/{thingId}/recommend',
        handler: (function(_this) {
          return function(request, reply) {
            var configuration, namespace, thing, thingId;
            thingId = request.params.thingId;
            namespace = Utils.GetNamespace(request);
            thing = thingId;
            configuration = _.defaults({
              "actions": {
                "view": 5,
                "buy": 10
              }
            }, default_configuration);
            return reco.recommendations_for_thing(namespace, thing, configuration).then(function(result) {
              if (!result || result.length === 0) {
                console.log("== RECOMMEND ERROR ==");
                console.log("== ", thingId, result);
                console.log("===============");
                return reply({
                  recommendations: []
                });
              } else {
                console.log("== RECOMMEND THING OK ==");
                console.log("== ", thingId, result);
                console.log("===============");
                return Utils.resolveItems(result, 0, function(err, resolved) {
                  if (err || !resolved) {
                    console.log("Could not execute resolveItems for thing -> ", err);
                    return reply({
                      recommendations: result.recommendations
                    });
                  } else {
                    console.log("INFO: resolveItems for thing  ", resolved);
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
              });
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
