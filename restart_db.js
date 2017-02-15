var RETHINKDB_HOST = process.env.RETHINKDB_HOST || 'g7-box';
var RETHINKDB_PORT = process.env.RETHINKDB_PORT || 28015;
var RETHINKDB_KEY = process.env.RETHINKDB_KEY || '';
var RETHINKDB_DB = process.env.RETHINKDB_DB || 'hapiger_it';
var RETHINKDB_TIMEOUT = process.env.RETHINKDB_TIMEOUT || 120;

var DEBUG = process.env.DEBUG || false;

var bb = require('bluebird');

var r = require('rethinkdbdash');
const connection = r({
    db: RETHINKDB_DB,
    timeout: RETHINKDB_TIMEOUT,
    servers: [
        {
            host: RETHINKDB_HOST,
            port: RETHINKDB_PORT
        }
    ]
});

function try_create_db(db) {
    return connection.dbCreate(db).run().then(function (res) {
        if(DEBUG) {
            console.log("try_create_db, ", res);
        }
        return true;
    }).catch(function (e) {
        console.log("Error: try_create_db, ", e);
        return true;
    });
}


function try_delete_db(db) {
    return connection.dbDrop(db).run().then(function (res) {
        if(DEBUG) {
            console.log("try_delete_db, ", res);
        }
        return true
    }).catch(function (e) {
        console.log("Error: try_delete_db, ", e);
        return true
    });
}

bb.all([
    try_delete_db(RETHINKDB_DB).delay(500),
    try_create_db(RETHINKDB_DB).delay(5000),
]).then(function(){
    console.log("OK");
    process.exit(0);
});


//drop db
//drop tables

//create tables
//create tables