bb = require("bluebird")
request = bb.promisify(require("request"))

class Not200Error extends Error
  constructor: (@message) ->
    @name = "Not200Error"
    Error.captureStackTrace(this, Not200Error)

process_response = (response) ->
  body = response.body

  json = JSON.parse(body)
  status = response.statusCode
  if status != 200
    console.log("Error: process_response, status, ",status)
    e = new Not200Error()
    e.status = status
    e.body = json
    throw e

#  console.log("process_response, ",json)

  [json, status]

class RECOClient
  constructor : (@server_uri) ->

########### NAMESPACE routes ################

  destroy_namespace: (namespace) ->
    req = {
      method: "DELETE",
      uri: "#{@server_uri}/namespaces/#{namespace}"
    }
    request(req)
      .then(process_response)

  show_namespaces: ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/namespaces"
    }
    request(req)
      .then(process_response)

  create_namespace: (namespace)->
    body = JSON.stringify({namespace: namespace})
#    console.log("create_namespace-> ","#{@server_uri}/namespaces", body)
    req = {
      method: "POST",
      body: body,
      uri: "#{@server_uri}/namespaces"
    }
    request(req)
      .then(process_response)


########### EVENTS routes ################

  create_events: (events) ->
    req = {
      method: "POST",
      body: JSON.stringify({events: events}),
      uri: "#{@server_uri}/events"
    }
    request(req)
      .then(process_response)

  show_events: (namespace, person, action, thing) ->
    uri = "#{@server_uri}/events?"
    params = []
    params.push "namespace=#{namespace}"
    params.push "person=#{person}" if person
    params.push "action=#{action}" if action
    params.push "thing=#{thing}" if thing
    uri += params.join('&')
    req = { method: "GET", uri: uri}
    request(req)
      .then(process_response)


########### RECOMMENDATIONS routes ################

  create_recommendations: (rec_body) ->
    req = {
      method: "POST",
      uri: "#{@server_uri}/recommendations"
      body: JSON.stringify(rec_body)
    }

    request(req)
      .then(process_response)


########### Maintenance routes ################

  create_compact: (namespace) ->
    req = {
      method: "POST",
      body: JSON.stringify({namespace: namespace}),
      uri: "#{@server_uri}/compact"
    }
    request(req)
      .then(process_response)

########### Comentarismo Namespace Website routes ################

  create_user: (namespace, name, id) ->
    req = {
      method: "POST",
      body: JSON.stringify({
        namespace: namespace
        id: id
        name: name
      }),
      uri: "#{@server_uri}/users/add"
    }
    request(req)
      .then(process_response)

  create_thing: (namespace, thing, image, link, id) ->
    req = {
      method: "POST",
      body: JSON.stringify({
        id:id,
        namespace: namespace
        thing: thing
        image: image
        link: link
      }),
      uri: "#{@server_uri}/items/add"
    }
    request(req)
      .then(process_response)

  user_like_thing: (namespace, user, thing) ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/users/#{user}/like/#{thing}?namespace=#{namespace}"
    }
    request(req)
      .then(process_response)

  get_commendations_for_user: (namespace, user) ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/users/#{user}/recommend?namespace=#{namespace}"
    }
    request(req)
      .then(process_response)

  get_commendations_for_thing: (namespace, thing) ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/thing/#{thing}/recommend?namespace=#{namespace}"
    }
    request(req)
      .then(process_response)

  user_likes: (namespace, user) ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/users/#{user}/likes?namespace=#{namespace}"
    }
    request(req)
      .then(process_response)

  clear:(namespace) ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/clear?namespace=#{namespace}"
    }
    request(req)
    .then(process_response)

  health:() ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/health"
    }
    request(req)
      .then(process_response)

  index:() ->
    req = {
      method: "GET",
      uri: "#{@server_uri}/"
    }
    request(req)


RECOClient.Not200Error = Not200Error

module.exports = RECOClient;
