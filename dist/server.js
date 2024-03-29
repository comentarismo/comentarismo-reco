(function() {
  var CACHE_ENABLED, Errors, Hapi, MemESM, NamespaceDoestNotExist, PORT, RECO, REDIS_HOST, REDIS_PASS, REDIS_PORT, RETHINKDB_BUFFER, RETHINKDB_DB, RETHINKDB_HOST, RETHINKDB_MAX, RETHINKDB_PORT, RETHINKDB_TIMEOUT, RethinkDBESM, ServerRecommendationEngine, _, bb, r, rethinkdbdash;

  bb = require('bluebird');

  _ = require("underscore");

  bb.Promise.longStackTraces();

  Hapi = require('hapi');

  RECO = require('./reco');

  rethinkdbdash = require('rethinkdbdash');

  r = rethinkdbdash;

  RethinkDBESM = require('./reco-rethinkdb');

  MemESM = require('./basic_in_memory_esm');

  PORT = process.env.PORT || 3456;

  REDIS_HOST = process.env.REDIS_HOST || "g7-box";

  REDIS_PORT = process.env.REDIS_PORT || 6379;

  REDIS_PASS = process.env.REDIS_PASSWORD || "";

  CACHE_ENABLED = process.env.CACHE_ENABLED || false;

  RETHINKDB_HOST = process.env.RETHINKDB_HOST || 'g7-box';

  RETHINKDB_PORT = process.env.RETHINKDB_PORT || 28015;

  RETHINKDB_DB = process.env.RETHINKDB_DB || 'hapiger_it';

  RETHINKDB_TIMEOUT = process.env.RETHINKDB_TIMEOUT || 120000;

  RETHINKDB_BUFFER = process.env.RETHINKDB_BUFFER || 10;

  RETHINKDB_MAX = process.env.RETHINKDB_MAX || 50;

  Errors = require('./errors');

  NamespaceDoestNotExist = Errors.NamespaceDoestNotExist;

  ServerRecommendationEngine = (function() {
    function ServerRecommendationEngine(options) {
      if (options == null) {
        options = {};
      }
      this.options = _.defaults(options, {
        esm: 'rethinkdb',
        esmoptions: {},
        port: PORT,
        logging_options: {
          reporters: {
            myConsoleReporter: [
              {
                module: 'good-squeeze',
                name: 'Squeeze',
                args: [
                  {
                    log: '*',
                    response: '*'
                  }
                ]
              }, {
                module: 'good-console'
              }, 'stdout'
            ]
          }
        }
      });
      switch (this.options.esm) {
        case 'memory':
          this._esm = new MemESM({});
          this._reco = new RECO(this._esm, this.options);
          break;
        case 'rethinkdb':
          r = r({
            host: RETHINKDB_HOST,
            port: RETHINKDB_PORT,
            db: RETHINKDB_DB,
            timeout: RETHINKDB_TIMEOUT,
            buffer: RETHINKDB_BUFFER,
            max: RETHINKDB_MAX
          });
          this._esm = new RethinkDBESM({
            r: r
          }, NamespaceDoestNotExist);
          this._reco = new RECO(this._esm, this.options);
          break;
        default:
          throw new Error("no such esm");
      }
    }

    ServerRecommendationEngine.prototype.initialize = function() {
      return bb["try"]((function(_this) {
        return function() {
          return _this.init_server();
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.setup_server();
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.add_server_routes();
        };
      })(this));
    };

    ServerRecommendationEngine.prototype.init_server = function(esm) {
      if (esm == null) {
        esm = 'rethinkdb';
      }
      if (CACHE_ENABLED) {
        this._server = new Hapi.Server({
          cache: [
            {
              name: 'redisCache',
              engine: require('catbox-redis'),
              host: REDIS_HOST,
              port: REDIS_PORT,
              password: REDIS_PASS,
              partition: 'cache'
            }
          ]
        });
      } else {
        this._server = new Hapi.Server();
      }
      this._server.connection({
        port: this.options.port
      });
      this._server.ext('onPreResponse', this.addCORS);
      return this.info = this._server.info;
    };

    ServerRecommendationEngine.prototype.setup_server = function() {
      return this.load_server_plugin('good', this.options.logging_options);
    };

    ServerRecommendationEngine.prototype.add_server_routes = function() {
      this.load_server_plugin('./api', {
        reco: this._reco
      });
      this.load_server_plugin('./routes', {
        reco: this._reco
      });
      this.load_jade_plugin('vision');
      return this.load_static_plugin('inert');
    };

    ServerRecommendationEngine.prototype.server_method = function(method, args) {
      var d;
      if (args == null) {
        args = [];
      }
      d = bb.defer();
      this._server.methods[method].apply(this, args.concat(function(err, result) {
        if (err) {
          return d.reject(err);
        } else {
          return d.resolve(result);
        }
      }));
      return d.promise;
    };

    ServerRecommendationEngine.prototype.start = function() {
      console.log("Starting Server on " + this.options.port);
      return this.start_server();
    };

    ServerRecommendationEngine.prototype.stop = function() {
      return this.stop_server();
    };

    ServerRecommendationEngine.prototype.load_jade_plugin = function(plugin, options) {
      var d, s;
      if (options == null) {
        options = {};
      }
      d = bb.defer();
      s = this._server;
      this._server.register({
        register: require(plugin),
        options: options
      }, function(err) {
        if (err) {
          return d.reject(err);
        } else {
          s.views({
            engines: {
              jade: require('jade')
            },
            path: __dirname + '/../views'
          });
          return d.resolve();
        }
      });
      return d.promise;
    };

    ServerRecommendationEngine.prototype.load_static_plugin = function(plugin, options) {
      var d, s;
      if (options == null) {
        options = {};
      }
      d = bb.defer();
      s = this._server;
      this._server.register({
        register: require(plugin),
        options: options
      }, function(err) {
        if (err) {
          return d.reject(err);
        } else {
          s.route({
            method: 'GET',
            path: '/{param*}',
            handler: {
              directory: {
                path: 'public'
              }
            }
          });
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
          });
          return d.resolve();
        }
      });
      return d.promise;
    };

    ServerRecommendationEngine.prototype.load_server_plugin = function(plugin, options) {
      var d;
      if (options == null) {
        options = {};
      }
      d = bb.defer();
      this._server.register({
        register: require(plugin),
        options: options
      }, function(err) {
        if (err) {
          return d.reject(err);
        } else {
          return d.resolve();
        }
      });
      return d.promise;
    };

    ServerRecommendationEngine.prototype.start_server = function() {
      var d;
      d = bb.defer();
      this._server.start((function(_this) {
        return function() {
          return d.resolve(_this);
        };
      })(this));
      return d.promise;
    };

    ServerRecommendationEngine.prototype.stop_server = function() {
      var d;
      d = bb.defer();
      this._server.stop(function() {
        return d.resolve();
      });
      return d.promise;
    };

    ServerRecommendationEngine.prototype.addCORS = function(request, reply) {
      var response;
      if (!request.headers.origin) {
        return reply["continue"]();
      } else {
        if (request.response.isBoom) {
          response = request.response.output;
        }
        if (!request.response.isBoom) {
          response = request.response;
        }
        response.headers['access-control-allow-origin'] = request.headers.origin;
        response.headers['access-control-allow-credentials'] = 'true';
        if (request.method !== 'options') {
          return reply["continue"]();
        } else {
          response.statusCode = 200;
          response.headers['access-control-expose-headers'] = 'content-type, content-length, etag';
          response.headers['access-control-max-age'] = 60 * 10;
          if (request.headers['access-control-request-headers']) {
            response.headers['access-control-allow-headers'] = request.headers['access-control-request-headers'];
          }
          if (request.headers['access-control-request-method']) {
            response.headers['access-control-allow-methods'] = request.headers['access-control-request-method'];
          }
          return reply["continue"]();
        }
      }
    };

    return ServerRecommendationEngine;

  })();

  module.exports = ServerRecommendationEngine;

}).call(this);

//# sourceMappingURL=server.js.map
