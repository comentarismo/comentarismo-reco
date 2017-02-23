Errors = {}

class NamespaceDoestNotExist extends Error
  constructor: () ->
    @name = "NamespaceDoestNotExist"
    @message = "namespace does not exist"
    Error.captureStackTrace(this, NamespaceDoestNotExist)

Errors.NamespaceDoestNotExist = NamespaceDoestNotExist

Errors.handle_error = (logger, err, reply) ->
#  console.log "handle_error -> ", err.stack
  if err.isBoom
    logger.log(['error'], err)
    reply(err)
  else
    logger.log(['error'], {error: "#{err}", stack: err.stack})
    reply({error: "An unexpected error occurred"}).code(500)

module.exports = Errors;