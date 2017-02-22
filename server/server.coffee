#PROMISES LIBRARY
bb = require 'bluebird'
_ = require "underscore"
bb.Promise.longStackTraces();

# HAPI STACK
Hapi = require 'hapi'

# RECO
RECO = require './reco'

rethinkdbdash = require 'rethinkdbdash'
r = rethinkdbdash

RethinkDBESM = require './reco-rethinkdb'

MemESM = require('./basic_in_memory_esm')

PORT = process.env.PORT || 3456

REDIS_HOST = process.env.REDIS_HOST || "g7-box"
REDIS_PORT = process.env.REDIS_PORT || 6379
REDIS_PASS = process.env.REDIS_PASSWORD || ""
CACHE_ENABLED = process.env.CACHE_ENABLED || false

RETHINKDB_HOST = process.env.RETHINKDB_HOST || 'g7-box'
RETHINKDB_PORT = process.env.RETHINKDB_PORT || 28015
RETHINKDB_DB = process.env.RETHINKDB_DB || 'hapiger_it'
RETHINKDB_TIMEOUT = process.env.RETHINKDB_TIMEOUT || 120000
RETHINKDB_BUFFER = process.env.RETHINKDB_BUFFER || 10
RETHINKDB_MAX = process.env.RETHINKDB_MAX || 50

Errors = require './errors'
NamespaceDoestNotExist = Errors.NamespaceDoestNotExist

class ServerRecommendationEngine
  constructor: (options = {}) ->
    @options = _.defaults(options, {
      esm: 'rethinkdb'
      esmoptions: {}
      port: PORT
      logging_options: {
        reporters: {
          myConsoleReporter: [{
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{log: '*', response: '*'}]
          }, {
            module: 'good-console'
          }, 'stdout'],
        }
      }
    })

    switch @options.esm
      when 'memory'
        @_esm = new MemESM({})
        @_reco = new RECO(@_esm, @options)
      when 'rethinkdb'
        r = r({ host: RETHINKDB_HOST, port: RETHINKDB_PORT, db: RETHINKDB_DB, timeout: RETHINKDB_TIMEOUT, buffer: RETHINKDB_BUFFER, max: RETHINKDB_MAX})
        @_esm = new RethinkDBESM({r: r}, NamespaceDoestNotExist)
        @_reco = new RECO(@_esm, @options)

      else
        throw new Error("no such esm")

  initialize: () ->
    bb.try(=> @init_server())
      .then(=> @setup_server())
      .then(=> @add_server_routes())

  init_server: (esm = 'rethinkdb') ->
    #SETUP SERVER

    if CACHE_ENABLED
      @_server = new Hapi.Server({
        cache: [{
          name: 'redisCache',
          engine: require('catbox-redis'),
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASS
          partition: 'cache'
        }]
      })
    else
      @_server = new Hapi.Server()

    @_server.connection({port: @options.port});
    @info = @_server.info

  setup_server: ->
    @load_server_plugin('good', @options.logging_options)

  add_server_routes: ->
    @load_server_plugin('./api', {reco: @_reco})
    @load_server_plugin('./routes', {reco: @_reco})
    @load_jade_plugin('vision')
    @load_static_plugin('inert')

  server_method: (method, args = []) ->
    d = bb.defer()
    @_server.methods[method].apply(@, args.concat((err, result) ->
      if (err)
        d.reject(err)
      else
        d.resolve(result)
    ))
    d.promise


  start: ->
    console.log "Starting Server on #{@options.port}"
    @start_server()

  stop: ->
    @stop_server()


  load_jade_plugin: (plugin, options = {}) ->
    d = bb.defer()
    s = @_server
    @_server.register({register: require(plugin), options: options}, (err) ->
      if (err)
        d.reject(err)
      else
        s.views({
          engines: { jade: require('jade') },
          path: __dirname + '/../views'
        })
        d.resolve()
    )
    d.promise


  load_static_plugin: (plugin, options = {}) ->
    d = bb.defer()
    s = @_server
    @_server.register({register: require(plugin), options: options}, (err) ->
      if (err)
        d.reject(err)
      else
        s.route({
          method: 'GET',
          path: '/{param*}',
          handler: {
            directory: {
              path: 'public'
            }
          }
        })
        s.route({
          method: 'GET',
          path: '/docs/{param*}',
          handler: {
            directory: {
              path: 'docs'
            }
          }
        });
        s.route({
          method: 'GET',
          path: '/coverage/lcov-report/{param*}',
          handler: {
            directory: {
              path: 'coverage/lcov-report'
            }
          }
        })
        d.resolve()
    )
    d.promise

  load_server_plugin: (plugin, options = {}) ->
    d = bb.defer()
    @_server.register({register: require(plugin), options: options}, (err) ->
      if (err)
        d.reject(err)
      else
        d.resolve()
    )
    d.promise

  start_server: ->
    d = bb.defer()
    @_server.start(=>
      d.resolve(@)
    )
    d.promise

  stop_server: ->
    d = bb.defer()
    @_server.stop(->
      d.resolve()
    )
    d.promise


module.exports = ServerRecommendationEngine