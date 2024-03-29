
hapigerjs = require("hapigerjs")
util = require('util')

PORT = process.env.PORT || 3456
NAMESPACE = process.env.NAMESPACE || "comentarismo"

bb = require 'bluebird'
_ = require "underscore"
moment = require "moment"

http_schema = require './http_schema'


# RECO
reco = require './reco'

Errors = require './errors'
NamespaceDoestNotExist = Errors.NamespaceDoestNotExist

Utils = {}

########### NAMESPACE funcs ################
#        TODO: #4 enable namespace filter
Utils.resolveItems = (namespace,result, count, cb) =>
  if (!result || !result.recommendations)
    console.log("Error: resolveItems called with invalid input -> !result || !result.recommendations -> ", result)
    return cb(result)
  else
    t = result.recommendations[count]
    if (!t)
      cb(null, result)
    else

      ns_thing = t.thing
#
      bb.all([
        Items.get(ns_thing).run({durability: reco.esm._DURABILITY})
      ]).spread(( doc) ->
        t.thing = doc.thing
        t.id = doc.id
        t.image = doc.image if doc.image
        t.link = doc.link if doc.link
        count = count + 1
        Utils.resolveItems(namespace,result, count, cb)
      ).catch(thinky.Errors.ValidationError, (err) ->
          console.log("Validation Error: " , err.message)
          Utils.resolveItems(namespace,result, count, cb)
      ).catch((err) ->
        console.log("Error: resolveItems, " , err.message)
        count = count + 1
        Utils.resolveItems(namespace,result, count, cb)
      )

Utils.GetNamespace = (request) ->
    if request.query && request.query.namespace
      request.query.namespace
    else if request.payload && request.payload.namespace
      request.payload.namespace
    else
      console.log("WARN: Could not GetNamespace, will be using default ", NAMESPACE)
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
        #namespace = Utils.GetNamespace(request)
        bb.all([
          User.limit(50).run({durability: reco.esm._DURABILITY})
          Items.limit(50).run({durability: reco.esm._DURABILITY})
        ]).spread((users , items) ->
          reply.view("index", {users:users, items:items, recommendations:[]})
        ).catch((err) =>
          reply({error: err}).code(500)
        )
    )


    plugin.route(
      method: 'GET',
      path: '/health',
      handler: (request, reply) =>
#        TODO: #4 enable namespace filter ?
#        namespace = Utils.GetNamespace(request)

        reco.esm._r.db('rethinkdb').table('server_status').run({durability: reco.esm._DURABILITY}).then((status) ->
          reply({status: status, ip: ip})
        ).catch((err) -> console.log("Error: ",err) reply({error: err}).code(500) )
    )

    ########### NAMESPACE routes clear ################

    plugin.route(
      method: 'GET',
      path: '/clear',
      config:
        validate:
          query: http_schema.namespace_request_schema,
      handler: (request, reply) =>
        bb.all([
            User.getAll(request.query.namespace, {index: 'namespace'}).delete().run({durability: reco.esm._DURABILITY})
            Items.getAll(request.query.namespace, {index: 'namespace'}).delete().run({durability: reco.esm._DURABILITY})
            Likes.getAll(request.query.namespace, {index: 'namespace'}).delete().run({durability: reco.esm._DURABILITY})
        ]).spread((user , items , likes) ->
            console.log("Removed  User, Items, Likes ", user, items, likes)
            reply({status: "ok", ip: ip})
        ).catch((err) -> console.log("Error: ",err) reply({error: err}).code(500))
    )
  
    plugin.route(
      method: 'GET',
      path: '/clear_all',
      handler: (request, reply) =>
        bb.all([
          User.delete().run({durability: reco.esm._DURABILITY})
          Items.delete().run({durability: reco.esm._DURABILITY})
          Likes.delete().run({durability: reco.esm._DURABILITY})
        ]).spread((user , items , likes) ->
          console.log("Removed  User, Items, Likes ", user, items, likes)
          reply({status: "ok", ip: ip})
        ).catch((err) -> console.log("Error: ",err) reply({error: err}).code(500))
    )
    

    ########### NAMESPACE routes Get user likes (current) ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/likes',
      handler: (request, reply) =>

        # Get user likes (current)
        userId = request.params.userId

        bb.all([
          User.get(userId).getJoin({likes:true}).run({durability: reco.esm._DURABILITY})
        ]).spread((user) ->
          reply(user)
        ).catch(thinky.Errors.ValidationError, (err) ->
          console.log("Validation Error: " + err.message)
          reply({error: err}).code(500)
        ).catch((err) ->
          console.log("Error: ",err)
          reply({error: err}).code(500)
        )
    )

    ########### NAMESPACE routes add a user ################

    plugin.route(
      method: 'POST',
      path: '/users/add',
      config:
        payload:
          parse: true
          override: 'application/json'
        validate:
          payload: http_schema.add_users_schema

      handler: (request, reply) =>
        name = request.payload.name
        namespace = Utils.GetNamespace(request)

        ns_user = name
        if name.indexOf(namespace) == -1
          ns_user = namespace + "_"+ name

#        console.log("Will save user -> ", ns_user)

        user   = new User({
          namespace : namespace
          id        : thinky.r.uuid(ns_user)
          name      : name
        })

        User.save(user , {conflict:'update'}).then((result) ->
          console.log("/users/add saved -> ",namespace, ns_user, result.id)
          reply({message: "ok", "id":result.id})
        ).catch(thinky.Errors.ValidationError, (err) ->
          console.log("Error: Validation -> ",namespace, ns_user, err.message)
          reply({error: err}).code(500)
        ).catch((err) ->
          #Unexpected error
          console.log("Error: ",err)
          reply({error: err}).code(500)
        )
    )

    ########### NAMESPACE routes add an item ################

    plugin.route(
      method: 'POST',
      path: '/items/add',
      config:
        payload:
          parse: true
          override: 'application/json'
        validate:
          payload: http_schema.add_items_schema
      handler: (request, reply) ->
        id = request.payload.id
        image = request.payload.image
        link = request.payload.link
        thing = request.payload.thing
        namespace = Utils.GetNamespace(request)

        ns_thing = thing

        if id
          ns_thing = namespace + "_" + id
        else if thing.indexOf(namespace) == -1
          ns_thing = namespace + "_" + thing
          
          
        console.log("INFO: items/add ns_thing -> ", ns_thing)

        items   = new Items({
          namespace : namespace,
          id        : thinky.r.uuid(ns_thing)
          thing     : thing
          image     : image,
          link      : link,
        })

        Items.save(items , {conflict:'update'}).then((result) ->
          console.log("/items/add saved -> ",namespace, thing, result.id)
          
#          check namespace exists, otherwise create
          namespace = request.payload.namespace
          reco.initialize_namespace(namespace)
            .then( ->
              reply({message: "ok", "id":result.id})
          )
            .catch((err) ->
              console.log("Error: initialize_namespace, ",err)
              reply({message: "ok", "id":result.id})
          )
          
        )
        .catch(thinky.Errors.ValidationError, (err) ->
          console.log("Validation Error: " + err.message)
          reply({error: err}).code(500)
        )
        .catch((err) ->
          console.log("Unexpected Error: " + err.message)
          console.log("Error: ",err)
          reply({error: err}).code(500)
        )
    )

    ########### NAMESPACE routes user likes something -- add the relationship ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/like/{itemId}',
      config:
        validate:
          params: http_schema.user_like_thing
          query:  http_schema.namespace_request_schema
      handler: (request, reply) =>
        userId = request.params.userId
        itemId = request.params.itemId
        namespace = Utils.GetNamespace(request)

        console.log("GET /users/#{userId}/like/#{itemId}")

        bb.all([
          User.get(userId).run({durability: reco.esm._DURABILITY})
          Items.get(itemId).run({durability: reco.esm._DURABILITY})
        ])
        .spread((user , item) ->
          if (user and item)
            likes   = new Likes({
              id        : thinky.r.uuid(user.id+"_"+item.id)
              namespace : namespace
              user      : user
              items     : item
            })
            likes.saveAll({user : true, items: true},{ conflict:'update'})
              .then((result) ->
                expireAt = moment().add(1, 'year').format()
                console.log("==== likes.saveAll -> ", result.id, expireAt)
                #TODO config date
                reco.events([{"namespace":namespace,"person": user.id,"action": "buy","thing": item.id,"expires_at": expireAt}])
                .then((events) ->
                  msg = util.format("User %s %s liked item %s %s", user.id, user.name, item.thing, item.id)
                  console.log("== LIKE ==")
                  console.log(msg)
                  console.log("==========")
                  reply({
                    id: result.id
                    message: msg
                  })
                )
                .catch(NamespaceDoestNotExist, (err) ->
                  console.log("ERROR: NamespaceDoestNotExist reco.events, ",err)
                  Errors.handle_error(request, Boom.notFound("Namespace Not Found"), reply).code(500)
                )
                .catch((err) ->
                  console.log("Error: reco.events, ", err) # Something went wrong
                  reply({message: util.format("Something went wrong. When User %s liked item %s", userId, itemId)}).code(500)
                )
              )
              .catch(thinky.Errors.DuplicatePrimaryKey, (err) ->
                console.log("Error: DuplicatePrimaryKey db.likes.insert, will ignore and assume we already did this action ", userId, itemId, err)
                msg = util.format("User %s %s already liked item %s %s", user.id, user.name, item.thing, item.id)
                reply({message: msg, error: err}).code(200)
              )
              .catch(thinky.Errors.ValidationError, (err) ->
                console.log("Error: ValidationError db.likes.insert ", userId, itemId, err)
                reply({error: err}).code(500)
              )
              .catch((err) ->
                console.log("Error: db.likes.insert ", userId, itemId, err)
                reply({error: err}).code(500)
              )
          else
            msg = util.format("Error: User %s already liked item %s", userId, itemId)
            console.log("== LIKE ==")
            console.log(msg)
            console.log("==========")
            reply({message: msg})
        )
        .catch((err) ->
          console.log("Error:  db.likes.insert ", userId, itemId, err)
          reply({error: err}).code(500)
        )
    )

    ########### NAMESPACE routes get recommendations ################

    plugin.route(
      method: 'GET',
      path: '/users/{userId}/recommend',
      config:
        validate:
          params: http_schema.user_recommend_thing
          query:  http_schema.namespace_request_schema
      handler: (request, reply) =>
        #get userId from request
        userId = request.params.userId
        #        TODO: #4 enable namespace filter
        namespace = Utils.GetNamespace(request)

        console.log("/users/#{userId}/recommend", userId,namespace)

        configuration = _.defaults({"actions": {"view": 5, "buy": 10}}, default_configuration)

        reco.recommendations_for_person(namespace, userId, configuration)
          .then( (result) ->
            if (!result || result.length == 0)
              console.log("== RECOMMEND ERROR ==")
              console.log("===============")
              reply({recommendations: []}).code(500)
            else
              console.log("== RECOMMEND USER OK ==")
              console.log("== length, ",result.recommendations.length)
              console.log("===============")
  #            //resolve items
              Utils.resolveItems(namespace,result, 0, (err, resolved) ->
                  if (err || !resolved)
                    console.log("Could not execute resolveItems -> ", err)
                    reply({recommendations: result.recommendations})
                  else
                    console.log("INFO: resolveItems for user length -> ", resolved.recommendations.length)
                    reply({recommendations: resolved.recommendations})
              )
          )
          .catch((err) ->
            console.error("Error: ", err) # // Something went wrong
            reply({error: err}).code(500)
          )
    )

    plugin.route(
      method: 'GET',
      path: '/thing/{thingId}/recommend',
      config:
        validate:
          params: http_schema.recommend_thing
          query:  http_schema.namespace_request_schema
      handler: (request, reply) =>

        #get thingId from request
        thingId = request.params.thingId
        namespace = Utils.GetNamespace(request)

        configuration = _.defaults({"actions": {"view": 5, "buy": 10}}, default_configuration)

        reco.recommendations_for_thing(namespace, thingId, configuration)
          .then( (result) ->
            if (!result || result.length == 0)
              console.log("== RECOMMEND ERROR ==")
              console.log("== ",thingId,result)
              console.log("===============")
              reply({recommendations: []})
            else
              console.log("== RECOMMEND THING OK ==",)
              console.log("== length ",thingId,result.recommendations.length)
              console.log("===============")
              #            //resolve items
              Utils.resolveItems(namespace,result, 0, (err, resolved) ->
                if (err || !resolved)
                  console.log("Error: Could not execute resolveItems for thing -> ", err)
                  reply({recommendations: result.recommendations})
                else
                  console.log("INFO: resolveItems for thing length -> ", resolved.recommendations.length)
                  reply({recommendations: resolved.recommendations})
              )
        ).catch((err) ->
          console.error("Error: ", err) # // Something went wrong
          reply({error: err}).code(500)
        )
    )

    ########### NAMESPACE routes ################

    next()


ROUTES.register.attributes =
  name: 'ROUTES'
  version: '1.0.0'

module.exports = ROUTES