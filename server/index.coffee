
ServerRecommendationEngine = require('./server')

server = new ServerRecommendationEngine()
server.initialize()
.then( -> server.start())
.catch((e) -> console.log "ERROR"; console.log e.stack)