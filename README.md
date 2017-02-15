# Comentarismo GER

# Install
`npm install`

# Prepare
* Install / Start Rethinkdb

## Prepare databases
`RETHINKDB_HOST=localhost node restart_db.js`

# Run GER with RethinkDB
```
$ make ger

lsof -i tcp:3456 | awk 'NR!=1 {print }' | xargs kill | true
sleep 2
nohup hapiger --es rethinkdb --esoptions '{"host":"g7-box","port": 28015,"db":"hapiger"}' &.
/bin/sh: line 0: .: filename argument required
.: usage: . filename [arguments]
make: *** [ger] Error 2
appending output to nohup.out
```

# Start ComentarismoGER
```
$ make start

node comentarismoger.js
body-parser deprecated bodyParser: use individual json/urlencoded middlewares comentarismoger.js:29:13
body-parser deprecated undefined extended: provide extended option node_modules/body-parser/index.js:105:29
Listening on port 7676
addr: 10.0.1.22
GET / 304 517.781 ms - -
GET /js/jquery-3.1.1.min.js 304 3.494 ms - -
GET /js/main.js 304 3.827 ms - -
```

[Comentarismo GER Localhost](http://localhost:7676/)