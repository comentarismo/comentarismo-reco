describe 'recommendations routes', ->
  describe 'POST recommendations', ->
    it 'should work', ->
      ns = random_namespace()
      start_server
      .then( ->
        client.create_namespace(ns)
      )
      .then( ->
        client.create_recommendations({namespace: ns, person: 'p'})
      )
      .spread( (body, resp) ->
        body.recommendations.length.should.equal 0
      )
      .then( ->
        client.destroy_namespace(ns)
      )

    it 'should return recommendations', ->
      ns = random_namespace()
      start_server
      .then( ->
        client.create_namespace(ns)
      )
      .then( ->
        events = []
        events.push {namespace: ns, person: 'alice', action: 'views', thing: 'LOTR', expires_at: tomorrow}
        events.push {namespace: ns, person: 'alice', action: 'views', thing: 'XMEN', expires_at: tomorrow}
        events.push {namespace: ns, person: 'bob', action: 'views', thing: 'XMEN',  expires_at: tomorrow}
        client.create_events(events)
      )
      .then( ->
        client.create_recommendations({
          namespace: ns,
          person: 'bob',
          configuration: {
            actions: {'views': 10}
            filter_previous_actions: ['views']
          }
        })
      )
      .spread( (body, resp) ->
        body.recommendations.length.should.equal 1
        body.recommendations[0].thing.should.equal 'LOTR'
      )
      .then( ->
        client.destroy_namespace(ns)
      )

    it 'should 404 on bad namespace', ->
      ns = random_namespace()
      start_server
      .then( ->
        client.create_recommendations({namespace: ns, person: 'p'})
      )
      .then( ->
        throw "SHOULD NOT GET HERE"
      )
      .catch(RECOClient.Not200Error, (e) ->
        e.status.should.equal 404
      )