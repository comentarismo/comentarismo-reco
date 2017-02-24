bb = require 'bluebird'
_ = require "underscore"

Joi = require 'joi'
Boom = require 'boom'

# RECO
reco = require './reco'

Errors = require './errors'
NamespaceDoestNotExist = Errors.NamespaceDoestNotExist

http_schema = require './http_schema'

API =
  register: (plugin, options, next) ->
    reco = options.reco
    default_configuration = options.default_configuration || {}

    ########### NAMESPACE routes ################
    plugin.route(
      method: 'GET',
      path: '/namespaces',
      handler: (request, reply) =>
        reco.list_namespaces()
        .then( (namespaces) ->
          reply({namespaces: namespaces})
        )
        .catch((err) -> Errors.handle_error(request, err, reply) )
    )

    plugin.route(
      method: 'DELETE',
      path: '/namespaces/{namespace}',
      handler: (request, reply) =>
        namespace = request.params.namespace
        reco.namespace_exists(namespace)
        .then( (exists) ->
          throw Boom.notFound() if !exists
          reco.destroy_namespace(namespace)
        )
        .then( ->
          reply({namespace: namespace})
        )
        .catch((err) -> Errors.handle_error(request, err, reply) )
    )

    plugin.route(
      method: 'POST',
      path: '/namespaces',
      config:
        payload:
          parse: true
          override: 'application/json'
        validate:
          payload: http_schema.namespace_request_schema

      handler: (request, reply) =>
#        console.log "namespaces -> request.payload, ",request.payload
        namespace = request.payload.namespace
        reco.initialize_namespace(namespace)
        .then( ->
          reply({namespace: namespace})
        )
        .catch((err) -> Errors.handle_error(request, err, reply) )
    )

    ########### EVENTS routes ################

    #POST create event
    plugin.route(
      method: 'POST',
      path: '/events',
      config:
        payload:
          parse: true
          override: 'application/json'
        validate:
          payload: http_schema.events_request_schema
      handler: (request, reply) =>
        reco.events(request.payload.events)
        .then( (event) ->
          reply(request.payload)
        )
        .catch(NamespaceDoestNotExist, (err) ->
          console.log "Error: POST create event, ",err
          Errors.handle_error(request, Boom.notFound("Namespace Not Found"), reply)
        )
        .catch((err) -> Errors.handle_error(request, err, reply) )
    )

    #GET event information
    plugin.route(
      method: 'GET',
      path: '/events',
      config:
        validate:
          query: http_schema.get_events_request_schema

      handler: (request, reply) =>
        query = {
          person: request.query.person,
          action: request.query.action,
          thing: request.query.thing
        }
        reco.find_events(request.query.namespace, query)
        .then( (events) ->
          reply({"events": events})
        )
        .catch((err) -> Errors.handle_error(request, err, reply) )
    )


    ########### RECOMMENDATIONS routes ################

    #POST recommendations
    plugin.route(
      method: 'POST',
      path: '/recommendations',
      config:
        payload:
          parse: true
          override: 'application/json'
        validate:
          payload: http_schema.recommendation_request_schema
      handler: (request, reply) =>

        person = request.payload.person
        thing = request.payload.thing
        namespace = request.payload.namespace
        configuration = _.defaults(request.payload.configuration, default_configuration)

        reco.namespace_exists(namespace)
        .then( (exists) ->
          throw Boom.notFound() if !exists
          if thing
            promise = reco.recommendations_for_thing(namespace, thing, configuration)
          else
            promise = reco.recommendations_for_person(namespace, person, configuration)

          promise
        )
        .then( (recommendations) ->
          reply(recommendations)
        )
        .catch((err) -> Errors.handle_error(request, err, reply))
    )

    ########### Maintenance routes ################
    plugin.route(
      method: 'POST',
      path: '/compact',
      config:
        payload:
          parse: true
          override: 'application/json'
        validate:
          payload: http_schema.namespace_request_schema

      handler: (request, reply) =>
        ns = request.payload.namespace
        reco.namespace_exists(ns)
        .then( (exists) ->
          throw Boom.notFound() if !exists
          reco.estimate_event_count(ns)
        )
        .then( (init_count) ->
          bb.all( [init_count, reco.compact_database(ns)] )
        )
        .spread((init_count) ->
          bb.all( [ init_count, reco.estimate_event_count(ns)] )
        )
        .spread((init_count, end_count) ->
          reply({ init_count: init_count, end_count: end_count, compression: "#{(1 - (end_count/init_count)) * 100}%" })
        )
        .catch((err) -> Errors.handle_error(request, err, reply) )
    )

    next()


API.register.attributes =
  name: 'API'
  version: '1.0.1'

module.exports = API