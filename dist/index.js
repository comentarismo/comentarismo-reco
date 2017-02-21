(function() {
  var ServerRecommendationEngine, server;

  ServerRecommendationEngine = require('./server');

  server = new ServerRecommendationEngine();

  server.initialize().then(function() {
    return server.start();
  })["catch"](function(e) {
    console.log("ERROR");
    return console.log(e.stack);
  });

}).call(this);

//# sourceMappingURL=index.js.map
