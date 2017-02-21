Comentarismo RECO
====================

# Install
`npm install`

# Prepare
* Install / Start Rethinkdb

## Prepare databases
`RETHINKDB_HOST=localhost node restart_db.js`

# Run RECO with RethinkDB
```
npm run start
```

[Comentarismo RECO Localhost](http://localhost:3456/)


# Tests for Comentarismo Recomendation Engine (RECO) Server

## Client API for JS Plugin
`mocha --opts test/api/mocha.opts test/api/api_tests.coffee`

### API Events
`mocha --opts test/api/mocha.opts test/api/events_routes_tests.coffee`

### API maintenance
`mocha --opts test/api/mocha.opts test/api/maintenance_routes_tests.coffee`

### API namespace
`mocha --opts test/api/mocha.opts test/api/namespace_routes_tests.coffee`

### API recommendations
`mocha --opts test/api/mocha.opts test/api/recommendations_routes_tests.coffee`

### API ALL IN ONE
`mocha --opts test/api/mocha.opts test/api/`

### RetinkDB Recommendation Test suite
`mocha --opts test/mocha.opts test/rethinkdb_esm_test.coffee`

### In Memory(Legacy) Recommendation Test suite
`mocha --opts test/mocha.opts test/in_memory_tests.coffee`

### All Together (Client,API,RethinkDB,Memory) Test suite
`npm run test`

# Run Test Coverage Report
`npm run coverage`

* Open on browser -> http://localhost:3456/coverage/lcov-report/index.html


# DOCUMENTATION
## Comentarismo-reco has automated generator for documentation, in order to generate the updated docs run: `npm run docs`
* Open on browser -> http://localhost:3456/docs/server.html


OTHER STUFF
---------------------------



# Competition:
http://www.suggestgrid.com/pricing
https://www.iprospect.com/en/ca/blog/10-sentiment-analysis-tools-track-social-marketing-success/


Promises:
https://github.com/matthiasg/bluebird-as


# ArangoDB
http://stackoverflow.com/questions/35680537/arangodb-how-to-implement-a-custom-recommendation-engine-using-graph



https://github.com/arangodb/arangojs#databaseedgecollection

https://www.arangodb.com/2014/12/getting-started-guacamole-rails/
https://github.com/railsbros-dirk/github_recommender
https://docs.arangodb.com/3.1/Manual/Graphs/index.html
https://docs.arangodb.com/3.1/cookbook/Graph/FulldepthTraversal.html
https://www.arangodb.com/2016/02/using-graphql-nosql-database-arangodb/
https://github.com/shekhargulati/52-technologies-in-2016/tree/master/27-learn-golang-for-great-good
https://github.com/arangodb/arangodb/?utm_content=buffer78efd


http://stackoverflow.com/questions/34196368/in-arangodb-will-querying-with-filters-from-the-neighbors-be-done-in-on/34203408#34203408

https://www.uport.me/
https://www.npmjs.com/package/flake