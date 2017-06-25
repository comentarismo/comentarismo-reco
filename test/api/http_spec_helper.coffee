process.env.NODE_ENV = 'test'

chai = require 'chai'
global.should = chai.should()
global.expect = chai.expect

global.bb = require 'bluebird'
#global._ = require 'underscore'
_ = require 'lodash'


global.moment = require 'moment'

bb.Promise.longStackTraces();

global.RECOClient = require './client'


ServerRecommendationEngine = require('../../server/server.coffee')


#global.server = new ServerRecommendationEngine()

# global.server = new HapiGER({esm:'pg', esmoptions: {"connection":"postgres://localhost/hapiger"}})
#

RETHINKDB_HOST = process.env.RETHINKDB_HOST || 'g7-box'
RETHINKDB_PORT = process.env.RETHINKDB_PORT || 28015
RETHINKDB_DB = process.env.RETHINKDB_DB || 'hapiger_it'
RETHINKDB_PASSWORD = process.env.RETHINKDB_PASSWORD || ''

global.server = new ServerRecommendationEngine({
  esm: 'rethinkdb', esmoptions: {
    "host": RETHINKDB_HOST,
    "port": RETHINKDB_PORT,
    "db": RETHINKDB_DB,
    'password': RETHINKDB_PASSWORD,
  }
})
#
#global.server = new HapiGER({esm:'mysql', esmoptions: {
#  connection: {
#    host: 'localhost',
#    port: 3306,
#    user: 'root',
#    password: ''
#  }
#}})\

global.client = null


global.start_server = server.initialize()
  .then(-> server.start())
  .then(->
  console.log("Will configure global.client with URL -> #{server.info.uri}")
  global.client = new RECOClient("#{server.info.uri}")
  server
)

global.random_namespace = ->
  "namespace_#{_.random(0, 99999999)}"

global.tenMinutesAgo = moment().subtract(10, 'minutes').format()


global.last_week = moment().subtract(7, 'days')
global.three_days_ago = moment().subtract(2, 'days')
global.two_days_ago = moment().subtract(2, 'days')
global.yesterday = moment().subtract(1, 'days')
global.soon = moment().add(50, 'mins')
global.today = moment()
global.now = today
global.tomorrow = moment().add(1, 'days')
global.next_week = moment().add(7, 'days')