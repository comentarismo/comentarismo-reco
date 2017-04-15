(function() {
  var Joi, add_items_schema, add_users_schema, configuration_schema, event_schema, events_request_schema, get_events_request_schema, namespace_request_schema, namespace_schema, recommendation_request_schema;

  Joi = require('joi');

  namespace_schema = Joi.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/);

  namespace_request_schema = Joi.object().keys({
    namespace: namespace_schema.required()
  });

  configuration_schema = Joi.object().keys({
    actions: Joi.object(),
    minimum_history_required: Joi.number().integer().min(0),
    neighbourhood_search_size: Joi.number().integer().min(1).max(250),
    similarity_search_size: Joi.number().integer().min(1).max(250),
    neighbourhood_size: Joi.number().integer().min(1).max(250),
    recommendations_per_neighbour: Joi.number().integer().min(1).max(250),
    filter_previous_actions: Joi.array().items(Joi.string()),
    event_decay_rate: Joi.number().min(1).max(10),
    time_until_expiry: Joi.number().integer().min(0).max(2678400),
    current_datetime: Joi.date().iso(),
    post_process_with: Joi.array()
  });

  recommendation_request_schema = Joi.object().keys({
    count: Joi.number().integer().min(1).max(200),
    person: Joi.string(),
    thing: Joi.string(),
    namespace: namespace_schema.required(),
    configuration: configuration_schema
  }).xor('person', 'thing');

  event_schema = Joi.object().keys({
    namespace: namespace_schema.required(),
    person: Joi.string().required(),
    action: Joi.string().required(),
    thing: Joi.string().required(),
    created_at: Joi.date().iso(),
    expires_at: Joi.date().iso()
  });

  events_request_schema = Joi.object().keys({
    events: Joi.array().items(event_schema).required()
  });

  get_events_request_schema = event_schema = Joi.object().keys({
    namespace: namespace_schema.required(),
    person: Joi.string(),
    action: Joi.string(),
    thing: Joi.string()
  });

  add_users_schema = Joi.object().keys({
    namespace: namespace_schema.required(),
    id: Joi.string(),
    name: Joi.string()
  });

  add_items_schema = Joi.object().keys({
    namespace: namespace_schema.required(),
    id: Joi.string(),
    thing: Joi.string(),
    image: Joi.string(),
    link: Joi.string()
  });

  module.exports = {
    get_events_request_schema: get_events_request_schema,
    events_request_schema: events_request_schema,
    event_schema: event_schema,
    recommendation_request_schema: recommendation_request_schema,
    configuration_schema: configuration_schema,
    namespace_request_schema: namespace_request_schema,
    add_users_schema: add_users_schema,
    add_items_schema: add_items_schema
  };

}).call(this);

//# sourceMappingURL=http_schema.js.map
