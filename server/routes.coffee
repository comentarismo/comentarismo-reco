Datastore = require('nedb')
hapigerjs = require("hapigerjs")
util = require('util')

PORT = process.env.PORT || 3456
NAMESPACE = process.env.NAMESPACE || "comentarismo"

bb = require 'bluebird'
_ = require "underscore"


# RECO
reco = require './reco'

Errors = require './errors'
NamespaceDoestNotExist = Errors.NamespaceDoestNotExist

Utils = {}

Utils.handle_error = (logger, err, reply) ->
  console.log "handle_error -> ", err.stack
  if err.isBoom
    console.log('error', err)
    reply(err)
  else
    console.log('error', {error: "#{err}", stack: err.stack})
    reply({error: "An unexpected error occurred"}).code(500)

########### NAMESPACE funcs ################
#        TODO: #4 enable namespace filter
Utils.resolveItems = (result, count, cb) =>
  if (!result || !result.recommendations)
    console.log("Error: resolveItems called with invalid input -> !result || !result.recommendations -> ", result)
    return cb(result)
  else
    t = result.recommendations[count]
    if (!t)
      cb(null, result)
    else
      console.log('t.thing ', t.thing)
#
      bb.all([
        Items.get(t.thing).run()
      ]).spread(( doc) ->
        console.log('itemId LIKE d'   , doc)
        t.thing = doc.thing
        t.id = doc.id
        console.log("Transformed thing -> ", t)
        count = count + 1
        Utils.resolveItems(result, count, cb)
      ).catch(thinky.Errors.ValidationError, (err) ->
          console.log("Validation Error: " , err.message)
          Utils.resolveItems(result, count, cb)
#          reply({error: err})
      ).catch((error) ->
        console.log("Error: " , err.message)
        count = count + 1
        Utils.resolveItems(result, count, cb)
#          reply({error: error})
      )

#      db.items.findOne({_id: t.thing}, (err, doc) ->
#        if (err || !doc)
#          console.log("Error: db.items.findOne, ", err)
#          cb(null, result)
#        else
#          t.thing = doc.thing
#          t._id = doc._id
#          console.log("Transformed thing -> ", t)
#          count = count + 1
#          Utils.resolveItems(result, count, cb)
#      )

Utils.GetNamespace = (request) ->
    if request.query.namespace
      request.query.namespace
    else
      NAMESPACE


db = {}
ip = null

ROUTES =
  register: (plugin, options, next) ->
    reco = options.reco

    global.thinky = require('thinky')({r:reco.esm._r})
    global.schema = require('../js/schema')(thinky)
    
    global.User    = schema.User
    global.Items    = schema.Items
    global.Likes    = schema.Likes


    default_configuration = options.default_configuration || {}

    require('dns').lookup(require('os').hostname(), (err, add, fam) ->
      console.log('addr: ' + add)
      ip = "http://" + add + ":" + PORT + "/"
    )

    reco.initialize_namespace(NAMESPACE).then(->
      console.log("Namespace started -> ", {namespace: NAMESPACE})
    ).catch((err) ->
      console.log("ERROR: Could not initialize namespace :O :O :O ... APP WILL EXIT -> ", NAMESPACE, err)
      process.exit(1)
    )

    ########### NAMESPACE routes ################

    plugin.route(
      method: 'GET',
      path: '/',
      handler: (request, reply) =>
#    // load stuff from database
#        TODO: #4 enable namespace filter
        namespace = Utils.GetNamespace(request)
        bb.all([
          User.run()
          Items.run()
        ]).spread((users , items) ->
          reply.view("index", {users:users, items:items, recommendations:[]})
        ).catch(thinky.Errors.ValidationError, (err) =>
          console.log("Validation Error: " + err.message)
          reply({error: err})
        ).catch((error) =>
          reply({error: error})
        )
    )


    plugin.route(
      method: 'GET',
      path: '/health',
      handler: (request, reply) =>
#        TODO: #4 enable namespace filter
        namespace = Utils.GetNamespace(request)

        reply({status: "ok", ip: ip})
          .header("Access-Control-Allow-Origin", "*")
          .header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    )

    ########### NAMESPACE routes clear ################

    plugin.route(
      method: 'GET',
      path: '/clear',
      handler: (request, reply) =>
        bb.all([
            User.delete().run()
            Items.delete().run()
            Likes.delete().run()
        ]).spread((user , item , like) ->
            console.log("Removed  likes")
            reply({status: "ok", ip: ip}).header("Access-Control-Allow-Origin", "*").header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        ).catch(thinky.Errors.ValidationError, (err) -> console.log("Validation Error: " + err.message) reply({error: err})
        ).catch((error) -> reply({error: error}))
    )

    ########### NAMESPACE routes Get user likes (current) ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/likes',
      handler: (request, reply) =>

#    // Get user likes (current)
        userId = request.params.userId
        #        TODO: #4 enable namespace filter
        namespace = Utils.GetNamespace(request)
        bb.all([
          User.get(userId).getJoin().run()
        ]).spread((user ) ->
          reply(user)
        ).catch(thinky.Errors.ValidationError, (err) ->
          console.log("Validation Error: " + err.message)
          reply({error: err})
        ).catch((error) ->
          reply({error: error})
        )
    )

    ########### NAMESPACE routes add a user ################

    plugin.route(
      method: 'GET',
      path: '/users/add',
      handler: (request, reply) =>
        name = request.query.name
        #        TODO: #4 enable namespace filter
        namespace = Utils.GetNamespace(request)

        console.log("Will save user -> ", name)

        user   = new User({
          id      : name
          name    : name
        })
        User.save(user , {conflict:'update'}).then((result) ->
           reply({message: "ok"})
        ).catch(thinky.Errors.ValidationError, (err) ->
          console.log("Validation Error: " + err.message)
          reply({error: err})
        ).catch((error) ->
          #Unexpected error
          reply({error: error})
        )
    )

    ########### NAMESPACE routes add an item ################

    plugin.route(
      method: 'GET',
      path: '/items/add',
      handler: (request, reply) =>
        thing = request.query.thing
        #        TODO: #4 enable namespace filter
        namespace = Utils.GetNamespace(request)

        items   = new Items({
          id    : thing
          thing  : thing
        })

        console.log("Will save thing -> ",thing)

        Items.save(items , {conflict:'update'}).then((result) ->
          reply({message: "ok"})
        )
        .catch(thinky.Errors.ValidationError, (err) ->
          console.log("Validation Error: " + err.message)
          reply({error: err})
        )
        .catch((err) ->
          console.log("Unexpected Error: " + err.message)
          reply({error: err})
        )
    )

    ########### NAMESPACE routes user likes something -- add the relationship ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/like/{itemId}',
      handler: (request, reply) =>
        userId = request.params.userId
        itemId = request.params.itemId
        namespace = Utils.GetNamespace(request)

        console.log("GET /users/#{userId}/like/#{itemId}")

        bb.all([
          User.get(userId).run()
          Items.get(itemId).run()
        ])
        .spread((user , item) ->
          if (user and item)
            likes   = new Likes({
              id :   thinky.r.uuid(user.id+item.id)
            })
            likes.user = user
            likes.items = item
            likes.saveAll({user : true, items: true},{ conflict:'update'})
              .then((result) ->
                console.log("db.likes.insert OK -> ", result)
                #TODO config date
                reco.events([{"namespace":namespace,"person": userId,"action": "buy","thing": itemId,"expires_at": "2017-03-30"}])
                .then((events) ->
                  msg = util.format("User %s liked item %s", userId, itemId)
                  console.log("== LIKE ==")
                  console.log(events,msg)
                  console.log("==========")
                  reply({
                    message: msg
                  })
                )
                .catch(NamespaceDoestNotExist, (err) ->
                  console.log("ERROR: POST create event, ",err)
                  Utils.handle_error(request, Boom.notFound("Namespace Not Found"), reply)
                )
                .catch((err) ->
                  console.log("Error: ", err) # Something went wrong
                  reply({message: util.format("Something went wrong. When User %s liked item %s", userId, itemId)})
                )
              )
              .catch(thinky.Errors.ValidationError, (err) ->
                console.log("Error:  db.likes.insert ", userId, itemId)
                reply({error: err})
              )
              .catch((error) ->
                console.log("Error:  db.likes.insert ", userId, itemId)
                reply({error: error})
              )
          else
            msg = util.format("Error: User %s already liked item %s", userId, itemId)
            console.log("== LIKE ==")
            console.log(msg)
            console.log("==========")
            reply({message: msg})
        )
        .catch((error) ->
          console.log("Error:  db.likes.insert ", userId, itemId)
          reply({error: error})
        )
    )

    ########### NAMESPACE routes get recommendations ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/recommend',
      handler: (request, reply) =>
        #get userId from request
        userId = request.params.userId
        #        TODO: #4 enable namespace filter
        namespace = Utils.GetNamespace(request)
        person = userId
        configuration = _.defaults({"actions": {"view": 5, "buy": 10}}, default_configuration)

        reco.recommendations_for_person(namespace, person, configuration)
          .then( (result) ->
            if (!result || result.length == 0)
              console.log("== RECOMMEND ERROR ==")
              console.log("===============")
              reply({recommendations: []})
            else
              console.log("== RECOMMEND USER OK ==")
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
            console.error("Error: ", err) # // Something went wrong
            reply({error: err})
          )
    )

    plugin.route(
      method: 'GET',
      path: '/thing/{thingId}/recommend',
      handler: (request, reply) =>

        #get thingId from request
        thingId = request.params.thingId
        namespace = Utils.GetNamespace(request)
        thing = thingId
        configuration = _.defaults({"actions": {"view": 5, "buy": 10}}, default_configuration)

        reco.recommendations_for_thing(namespace, thing, configuration)
          .then( (result) ->
            if (!result || result.length == 0)
              console.log("== RECOMMEND ERROR ==")
              console.log("== ",thingId,result)
              console.log("===============")
              reply({recommendations: []})
            else
              console.log("== RECOMMEND THING OK ==",)
              console.log("== ",thingId,result)
              console.log("===============")
              #            //resolve items
              Utils.resolveItems(result, 0, (err, resolved) ->
                if (err || !resolved)
                  console.log("Could not execute resolveItems for thing -> ", err)
                  reply({recommendations: result.recommendations})
                else
                  console.log("INFO: resolveItems for thing  ", resolved)
                  reply({recommendations: resolved.recommendations})
              )
        ).catch((err) ->
          console.error("Error: ", err) # // Something went wrong
          reply({error: err})
        )
    )

    ########### NAMESPACE routes ################

    next()


ROUTES.register.attributes =
  name: 'ROUTES'
  version: '1.0.0'

module.exports = ROUTES