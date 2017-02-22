(function() {
  var API, Boom, Errors, Joi, NamespaceDoestNotExist, Utils, _, bb, configuration_schema, event_schema, events_request_schema, get_events_request_schema, namespace_request_schema, namespace_schema, reco, recommendation_request_schema;

  bb = require('bluebird');

  _ = require("underscore");

  Joi = require('joi');

  Boom = require('boom');

  reco = require('./reco');

  Errors = require('./errors');

  NamespaceDoestNotExist = Errors.NamespaceDoestNotExist;

  namespace_schema = Joi.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/);

  namespace_request_schema = Joi.object().keys({
    namespace: namespace_schema.required()
  });

  configuration_schema = Joi.object().keys({
    actions: Joi.object(),
    minimum_history_required: Joi.number().integer().min(0),
    neighbourhood_search_size: Joi.number().integer().min(1).max(250),
    similarity_search_size: Joi.number().integer().min(1).max(250),
    neighbourhood_size: Joi.number().integer().min(1).max(250),
    recommendations_per_neighbour: Joi.number().integer().min(1).max(250),
    filter_previous_actions: Joi.array().items(Joi.string()),
    event_decay_rate: Joi.number().min(1).max(10),
    time_until_expiry: Joi.number().integer().min(0).max(2678400),
    current_datetime: Joi.date().iso(),
    post_process_with: Joi.array()
  });

  recommendation_request_schema = Joi.object().keys({
    count: Joi.number().integer().min(1).max(200),
    person: Joi.string(),
    thing: Joi.string(),
    namespace: namespace_schema.required(),
    configuration: configuration_schema
  }).xor('person', 'thing');

  event_schema = Joi.object().keys({
    namespace: namespace_schema.required(),
    person: Joi.string().required(),
    action: Joi.string().required(),
    thing: Joi.string().required(),
    created_at: Joi.date().iso(),
    expires_at: Joi.date().iso()
  });

  events_request_schema = Joi.object().keys({
    events: Joi.array().items(event_schema).required()
  });

  get_events_request_schema = event_schema = Joi.object().keys({
    namespace: namespace_schema.required(),
    person: Joi.string(),
    action: Joi.string(),
    thing: Joi.string()
  });

  Utils = {};

  Utils.handle_error = function(logger, err, reply) {
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

  API = {
    register: function(plugin, options, next) {
      var default_configuration;
      reco = options.reco;
      default_configuration = options.default_configuration || {};
      plugin.route({
        method: 'GET',
        path: '/namespaces',
        handler: (function(_this) {
          return function(request, reply) {
            return reco.list_namespaces().then(function(namespaces) {
              return reply({
                namespaces: namespaces
              });
            })["catch"](function(err) {
              return Utils.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'DELETE',
        path: '/namespaces/{namespace}',
        handler: (function(_this) {
          return function(request, reply) {
            var namespace;
            namespace = request.params.namespace;
            return reco.namespace_exists(namespace).then(function(exists) {
              if (!exists) {
                throw Boom.notFound();
              }
              return reco.destroy_namespace(namespace);
            }).then(function() {
              return reply({
                namespace: namespace
              });
            })["catch"](function(err) {
              return Utils.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'POST',
        path: '/namespaces',
        config: {
          payload: {
            parse: true,
            override: 'application/json'
          },
          validate: {
            payload: namespace_request_schema
          }
        },
        handler: (function(_this) {
          return function(request, reply) {
            var namespace;
            namespace = request.payload.namespace;
            return reco.initialize_namespace(namespace).then(function() {
              return reply({
                namespace: namespace
              });
            })["catch"](function(err) {
              return Utils.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'POST',
        path: '/events',
        config: {
          payload: {
            parse: true,
            override: 'application/json'
          },
          validate: {
            payload: events_request_schema
          }
        },
        handler: (function(_this) {
          return function(request, reply) {
            return reco.events(request.payload.events).then(function(event) {
              return reply(request.payload);
            })["catch"](NamespaceDoestNotExist, function(err) {
              console.log("Error: POST create event, ", err);
              return Utils.handle_error(request, Boom.notFound("Namespace Not Found"), reply);
            })["catch"](function(err) {
              return Utils.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/events',
        config: {
          validate: {
            query: get_events_request_schema
          }
        },
        handler: (function(_this) {
          return function(request, reply) {
            var query;
            query = {
              person: request.query.person,
              action: request.query.action,
              thing: request.query.thing
            };
            return reco.find_events(request.query.namespace, query).then(function(events) {
              return reply({
                "events": events
              });
            })["catch"](function(err) {
              return Utils.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'POST',
        path: '/recommendations',
        config: {
          payload: {
            parse: true,
            override: 'application/json'
          },
          validate: {
            payload: recommendation_request_schema
          }
        },
        handler: (function(_this) {
          return function(request, reply) {
            var configuration, namespace, person, thing;
            person = request.payload.person;
            thing = request.payload.thing;
            namespace = request.payload.namespace;
            configuration = _.defaults(request.payload.configuration, default_configuration);
            return reco.namespace_exists(namespace).then(function(exists) {
              var promise;
              if (!exists) {
                throw Boom.notFound();
              }
              if (thing) {
                promise = reco.recommendations_for_thing(namespace, thing, configuration);
              } else {
                promise = reco.recommendations_for_person(namespace, person, configuration);
              }
              return promise;
            }).then(function(recommendations) {
              return reply(recommendations);
            })["catch"](function(err) {
              return Utils.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'POST',
        path: '/compact',
        config: {
          payload: {
            parse: true,
            override: 'application/json'
          },
          validate: {
            payload: namespace_request_schema
          }
        },
        handler: (function(_this) {
          return function(request, reply) {
            var ns;
            ns = request.payload.namespace;
            return reco.namespace_exists(ns).then(function(exists) {
              if (!exists) {
                throw Boom.notFound();
              }
              return reco.estimate_event_count(ns);
            }).then(function(init_count) {
              return bb.all([init_count, reco.compact_database(ns)]);
            }).spread(function(init_count) {
              return bb.all([init_count, reco.estimate_event_count(ns)]);
            }).spread(function(init_count, end_count) {
              return reply({
                init_count: init_count,
                end_count: end_count,
                compression: ((1 - (end_count / init_count)) * 100) + "%"
              });
            })["catch"](function(err) {
              return Utils.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      return next();
    }
  };

  API.register.attributes = {
    name: 'API',
    version: '1.0.0'
  };

  module.exports = API;

}).call(this);

//# sourceMappingURL=api.js.map
