var PORT = process.env.PORT || 7676;

var express = require('express');
var app = express();

var basicAuth = require('basic-auth-connect');
var compress = require('compression');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var path = require('path');


//set this var to anything to disable http binding
var ENABLE_HTTP = process.env.ENABLE_HTTP || true;

//auth settings
var username = process.env.HTTP_AUTH_USER || "admin";
var password = process.env.HTTP_AUTH_PASS || "g4";

if(ENABLE_HTTP) {

    app.use(morgan('dev'));

    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    app.use(express.static(__dirname + '/public'));

    app.use(bodyParser());
    app.use(compress());

    app.use(basicAuth(username, password));
    require('./routes/index')(app);

    app.use(express.static( path.join(__dirname, 'public')));

    // listen
    app.listen(PORT, function () {
        console.log('Listening on port ' + PORT);
    });

}

