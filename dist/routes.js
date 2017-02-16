// Generated by CoffeeScript 1.12.3
(function() {
  var Datastore, PORT, ROUTES, Utils, _, bb, client, db, hapigerjs, ip, reco, url, util;

  Datastore = require('nedb');

  hapigerjs = require("hapigerjs");

  util = require('util');

  PORT = process.env.PORT || 7676;

  url = process.env.URL || "http://localhost";

  client = new hapigerjs.Driver({
    url: url,
    port: PORT
  });

  bb = require('bluebird');

  _ = require("underscore");

  reco = require('./reco');

  Utils = {};

  Utils.handle_error = function(logger, err, reply) {
    console.log("handle_error -> ", err.stack);
    if (err.isBoom) {
      logger.log(['error'], err);
      return reply(err);
    } else {
      logger.log(['error'], {
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
              return console.log("Error: db.items.findOne, ", err);
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

  Utils.createEvent = function(count, events, cb) {
    var event;
    event = events[count];
    if (!event) {
      return cb();
    }
    return createEvent(event, function(err) {
      if (err) {
        console.log("Error: createEvents --> ", err);
      }
      count = count + 1;
      return createEvents(count, events, cb);
    });
  };

  Utils.createEvent = function(user, cb) {
    return client.POST("/events", {
      events: [user]
    }).then(function(err, result) {
      if (err) {
        console.log("Error: createUser --> ", err);
        return cb(err);
      } else {
        console.log(result);
        console.log("Event added to DB:");
        console.log("-------------------------");
        return cb(null, result);
      }
    });
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
      client.POST("/namespaces", {
        namespace: "comentarismo"
      });
      db.users = new Datastore('db/users.db');
      db.items = new Datastore('db/items.db');
      db.likes = new Datastore('db/likes.db');
      db.users.loadDatabase();
      db.items.loadDatabase();
      db.likes.loadDatabase();
      plugin.route({
        method: 'GET',
        path: '/',
        handler: (function(_this) {
          return function(request, reply) {
            return db.users.find({}, function(err, users) {
              return db.items.find({}, function(err, items) {
                return reply.view("index", {
                  users: users,
                  items: items,
                  recommendations: []
                });
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
            return db.items.remove({}, function(err, numRemoved) {
              console.log("Removed " + numRemoved + " items");
              return db.users.remove({}, function(err, numRemoved) {
                console.log("Removed " + numRemoved + " users");
                return db.likes.remove({}, function(err, numRemoved) {
                  console.log("Removed " + numRemoved + " likes");
                  return reply({
                    status: "ok",
                    ip: ip
                  }).header("Access-Control-Allow-Origin", "*").header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                });
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
            var userId;
            userId = request.params.userId;
            return db.likes.find({
              userId: userId
            }, function(err, items) {
              var error;
              if (err) {
                error = util.format("Error: likes, User %s error %s", userId, err);
                console.log(error);
                return reply({
                  error: error
                });
              } else {
                return reply(items);
              }
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/add',
        handler: (function(_this) {
          return function(request, reply) {
            var name;
            name = request.query.name;
            return db.users.insert({
              name: name
            }, function(err, doc) {
              var error;
              if (err) {
                error = util.format("Error: User %s error %s", name, err);
                console.log(error);
                return reply({
                  error: error
                });
              } else {
                console.log("Saved user to store.");
                console.log(doc);
                console.log("--------------------");
                return reply({
                  message: "ok"
                });
              }
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/items/add',
        handler: (function(_this) {
          return function(request, reply) {
            var thing;
            thing = request.query.thing;
            return db.items.insert({
              thing: thing
            }, function(err, doc) {
              if (err) {
                return reply({
                  error: err
                });
              } else {
                console.log("Saved thing to items table, ", thing);
                console.log(doc);
                console.log("--------------------");
                return reply({
                  message: "ok"
                });
              }
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/{userId}/like/{itemId}',
        handler: (function(_this) {
          return function(request, reply) {
            var itemId, userId;
            userId = request.params.userId;
            itemId = request.params.itemId;
            return db.likes.find({
              userId: userId,
              itemId: itemId
            }, function(err, docs) {
              var msg;
              if (docs.length < 1) {
                return db.likes.insert({
                  userId: userId,
                  itemId: itemId
                }, function(err, doc) {
                  if (err) {
                    console.log("Error:  db.likes.insert ", userId, itemId);
                    return reply({
                      error: err
                    });
                  }
                  console.log("db.likes.insert OK -> ", doc);
                  return client.POST("/events", {
                    events: [
                      {
                        "namespace": "comentarismo",
                        "person": userId,
                        "action": "buy",
                        "thing": itemId,
                        "expires_at": "2017-03-30"
                      }
                    ]
                  }).then(function(response) {
                    var msg;
                    msg = util.format("User %s liked item %s", userId, itemId);
                    console.log("== LIKE ==");
                    console.log(response);
                    console.log("==========");
                    console.log(msg);
                    return reply({
                      message: msg
                    });
                  })["catch"](function(err) {
                    console.error("Error: ", err);
                    return reply({
                      message: util.format("Something went wrong. When User %s liked item %s", userId, itemId)
                    });
                  });
                });
              } else {
                msg = util.format("User already %s liked item %s", userId, itemId);
                console.log("== LIKE ==");
                console.log(msg);
                console.log("==========");
                return reply({
                  message: msg
                });
              }
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/users/{userId}/recommend',
        handler: (function(_this) {
          return function(request, reply) {
            var userId;
            userId = request.params.userId;
            return client.POST("/recommendations", {
              "namespace": "comentarismo",
              "person": userId,
              "configuration": {
                "actions": {
                  "view": 5,
                  "buy": 10
                }
              }
            }).then(function(result) {
              if (!result || result.length === 0) {
                console.log("== RECOMMEND ERROR ==");
                console.log("===============");
                return reply({
                  recommendations: []
                });
              } else {
                console.log("== RECOMMEND OK ==");
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
      return next();
    }
  };

  ROUTES.register.attributes = {
    name: 'ROUTES',
    version: '1.0.0'
  };

  module.exports = ROUTES;

}).call(this);
