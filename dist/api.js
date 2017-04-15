(function() {
  var API, Boom, Errors, Joi, NamespaceDoestNotExist, _, bb, http_schema, reco;

  bb = require('bluebird');

  _ = require("underscore");

  Joi = require('joi');

  Boom = require('boom');

  reco = require('./reco');

  Errors = require('./errors');

  NamespaceDoestNotExist = Errors.NamespaceDoestNotExist;

  http_schema = require('./http_schema');

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
              return Errors.handle_error(request, err, reply);
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
              return Errors.handle_error(request, err, reply);
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
            payload: http_schema.namespace_request_schema
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
              return Errors.handle_error(request, err, reply);
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
            payload: http_schema.events_request_schema
          }
        },
        handler: (function(_this) {
          return function(request, reply) {
            return reco.events(request.payload.events).then(function(event) {
              return reply(request.payload);
            })["catch"](NamespaceDoestNotExist, function(err) {
              console.log("Error: POST create event, ", err);
              return Errors.handle_error(request, Boom.notFound("Namespace Not Found"), reply);
            })["catch"](function(err) {
              return Errors.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      plugin.route({
        method: 'GET',
        path: '/events',
        config: {
          validate: {
            query: http_schema.get_events_request_schema
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
              return Errors.handle_error(request, err, reply);
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
            payload: http_schema.recommendation_request_schema
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
              return Errors.handle_error(request, err, reply);
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
            payload: http_schema.namespace_request_schema
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
              return Errors.handle_error(request, err, reply);
            });
          };
        })(this)
      });
      return next();
    }
  };

  API.register.attributes = {
    name: 'API',
    version: '1.0.1'
  };

  module.exports = API;

}).call(this);

//# sourceMappingURL=api.js.map
