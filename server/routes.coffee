Datastore = require('nedb')
hapigerjs = require("hapigerjs")
util = require('util')

PORT = process.env.PORT || 3456;

bb = require 'bluebird'
_ = require "underscore"


# RECO
reco = require './reco'

RECO = reco.RECO


Utils = {}

Utils.handle_error = (logger, err, reply) ->
  console.log "handle_error -> ", err.stack
  if err.isBoom
    logger.log(['error'], err)
    reply(err)
  else
    logger.log(['error'], {error: "#{err}", stack: err.stack})
    reply({error: "An unexpected error occurred"}).code(500)

########### NAMESPACE funcs ################
Utils.resolveItems = (result, count, cb) =>
  if (!result || !result.recommendations)
    console.log("Error: resolveItems called with invalid input -> !result || !result.recommendations -> ", result)
    return cb(result)
  else
    t = result.recommendations[count]
    if (!t)
      cb(null, result)
    else
      db.items.findOne({_id: t.thing}, (err, doc) ->
        if (err || !doc)
          console.log("Error: db.items.findOne, ", err)
        else
#// result[count] = doc
          t.thing = doc.thing;
          t._id = doc._id;
          console.log("Transformed thing -> ", t);
          #    // resolved.push(t)
          count = count + 1;
          Utils.resolveItems(result, count, cb);
      )

Utils.createEvent = (count, events, cb) ->
  event = events[count];
  if (!event)
    return cb()

  createEvent(event, (err) ->
    if (err)
      console.log("Error: createEvents --> ", err)

    count = count + 1
    createEvents(count, events, cb)
  )

Utils.createEvent = (user, cb) ->
  client.POST("/events", {
    events: [user]
  }).then((err, result) ->
    if (err)
      console.log("Error: createUser --> ", err);
      cb(err)
    else
      console.log(result);
      console.log("Event added to DB:");
      console.log("-------------------------");
      cb(null, result);
  )



db = {};
ip = null;

ROUTES =
  register: (plugin, options, next) ->
    reco = options.reco
    default_configuration = options.default_configuration || {}

    require('dns').lookup(require('os').hostname(), (err, add, fam) ->
      console.log('addr: ' + add)
      ip = "http://" + add + ":" + PORT + "/"
    )

    reco.initialize_namespace("comentarismo")
      .then( ->
      console.log("Namespace started -> ",{namespace: "comentarismo"})
    )
    .catch((err) ->
      console.log("ERROR: Could not initialize namespace :O :O :O ... APP WILL EXIT -> ", err)
      process.exit(1)
    )

    #    // storage
    db.users = new Datastore('db/users.db');
    db.items = new Datastore('db/items.db');
    db.likes = new Datastore('db/likes.db');

    #// You need to load each database asynchronously
    db.users.loadDatabase();
    db.items.loadDatabase();
    db.likes.loadDatabase();


    ########### NAMESPACE routes ################

    plugin.route(
      method: 'GET',
      path: '/',
      handler: (request, reply) =>
#    // load stuff from database
        db.users.find({}, (err, users) ->
          db.items.find({},  (err, items) ->
            reply.view("index", {users:users, items:items, recommendations:[]});
          )
        )
    )


    plugin.route(
      method: 'GET',
      path: '/health',
      handler: (request, reply) =>
        reply({status: "ok", ip: ip})
          .header("Access-Control-Allow-Origin", "*")
          .header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    )

    ########### NAMESPACE routes clear ################

    plugin.route(
      method: 'GET',
      path: '/clear',
      handler: (request, reply) =>

#        //remove
        db.items.remove({}, (err, numRemoved) ->
          console.log("Removed " + numRemoved + " items");

          db.users.remove({}, (err, numRemoved) ->
            console.log("Removed " + numRemoved + " users");

            db.likes.remove({}, (err, numRemoved) ->
              console.log("Removed " + numRemoved + " likes");
              reply({status: "ok", ip: ip})
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
            )
          )
        )
    )

    ########### NAMESPACE routes Get user likes (current) ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/likes',
      handler: (request, reply) =>

#    // Get user likes (current)
        userId = request.params.userId;

        db.likes.find({userId: userId}, (err, items) ->
          if (err)
            error = util.format("Error: likes, User %s error %s", userId, err);
            console.log(error);
            reply({error: error})
          else
            reply(items)
        )
    )

    ########### NAMESPACE routes add a user ################

    plugin.route(
      method: 'GET',
      path: '/users/add',
      handler: (request, reply) =>
        name = request.query.name
  #    // add user to DB
        db.users.insert({name: name}, (err, doc) ->
          if (err)
            error = util.format("Error: User %s error %s", name, err)
            console.log(error)
            reply({error: error})
          else
            console.log("Saved user to store.");
            console.log(doc);
            console.log("--------------------");
            reply({message: "ok"});
        )
    )

    ########### NAMESPACE routes add an item ################

    plugin.route(
      method: 'GET',
      path: '/items/add',
      handler: (request, reply) =>
        thing = request.query.thing
  #    // add user to DB
        db.items.insert({thing: thing}, (err, doc) ->
          if (err)
            reply({error: err})
          else
            console.log("Saved thing to items table, ", thing)
            console.log(doc)
            console.log("--------------------")
            reply({message: "ok"})
        )
    )

    ########### NAMESPACE routes user likes something -- add the relationship ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/like/{itemId}',
      handler: (request, reply) =>
        userId = request.params.userId
        itemId = request.params.itemId
        db.likes.find({userId: userId, itemId: itemId}, (err, docs) ->
          if (docs.length < 1)
            db.likes.insert({userId: userId, itemId: itemId,}, (err, doc) ->
              if (err)
                console.log("Error:  db.likes.insert ", userId, itemId)
                return reply({error: err})

              console.log("db.likes.insert OK -> ", doc)
              reco.events([{"namespace": "comentarismo","person": userId,"action": "buy","thing": itemId,"expires_at": "2017-03-30"}])
              .then( (events) ->
                  msg = util.format("User %s liked item %s", userId, itemId)
                  console.log("== LIKE ==")
                  console.log(events)
                  console.log("==========")
                  console.log(msg)
                  reply({
                    message: msg
                  });
              )
              .catch(RECO.NamespaceDoestNotExist, (err) ->
                console.log "POST create event, ",err
                Utils.handle_error(request, Boom.notFound("Namespace Not Found"), reply)
              )
              .catch((err) ->
                console.error("Error: ", err) # Something went wrong
                reply({message: util.format("Something went wrong. When User %s liked item %s", userId, itemId)})
              )
            )
          else
            msg = util.format("User already %s liked item %s", userId, itemId)
            console.log("== LIKE ==")
            console.log(msg)
            console.log("==========")
            reply({message: msg})
        )
    )

    ########### NAMESPACE routes get recommendations ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/recommend',
      handler: (request, reply) =>
        #//get userid from session
        userId = request.params.userId;

        person = userId
        namespace = "comentarismo"
        configuration = _.defaults({"actions": {"view": 5, "buy": 10}}, default_configuration)

        reco.recommendations_for_person(namespace, person, configuration)
          .then( (result) ->
            if (!result || result.length == 0)
              console.log("== RECOMMEND ERROR ==");
              console.log("===============");
              reply({recommendations: []});
            else
              console.log("== RECOMMEND OK ==")
              console.log(result)
              console.log("===============")
  #            //resolve items
              Utils.resolveItems(result, 0, (err, resolved) ->
                  if (err || !resolved)
                    console.log("Could not execute resolveItems -> ", err)
                    reply({recommendations: result.recommendations})
                  else
                    console.log("INFO: resolveItems, ", resolved)
                    reply({recommendations: resolved.recommendations})
              )
          )
          .catch((err) ->
            console.error("Error: ", err); # // Something went wrong
            reply({error: err})
          )
    )



      ########### NAMESPACE routes ################

    next()


ROUTES.register.attributes =
  name: 'ROUTES'
  version: '1.0.0'

module.exports = ROUTES