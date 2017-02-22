const thinky = require('thinky')({
  host     : process.env.RETHINKDB_HOST || 'g7-box',
  port     : process.env.RETHINKDB_PORT || 28015,
  db       : process.env.RETHINKDB_DB || 'hapiger_it',
  user     : process.env.RETHINKDB_USER,
  password : process.env.RETHINKDB_PASSWORD
});

module.exports = thinky;
