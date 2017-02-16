#mocha --opts test/api/mocha.opts test/api/api_tests.coffee

describe 'User recommendation routes', ->
  describe 'User like things and get recommendations', ->
    it 'should create users & things, like things, recommend thing for a user', ->
      start_server.then(->
        bb.all([
          client.create_user('Edson')
          client.create_user('Maria')
          client.create_user('Francis')
          client.create_user('Clovis')
          client.create_user('John')
        ])
      ).spread((r1, r2, r3, r4, r5) ->
        r1.should.not.be.null
        r2.should.not.be.null
        r3.should.not.be.null
        r4.should.not.be.null
        r5.should.not.be.null
      ).then(-> bb.all([
        client.create_thing('Book')
        client.create_thing('Eat')
        client.create_thing('Money')
        client.create_thing('Beach')
        client.create_thing('Beer')
      ])).spread((r1, r2, r3, r4, r5) ->
        r1.should.not.be.null
        r2.should.not.be.null
        r3.should.not.be.null
        r4.should.not.be.null
        r5.should.not.be.null
      ).then(-> bb.all([
        client.user_like_thing('Edson', 'Book')
        client.user_like_thing('Edson', 'Eat')
        client.user_like_thing('Edson', 'Money')
        client.user_like_thing('Clovis', 'Beach')
        client.user_like_thing('Clovis', 'Beer')
        client.user_like_thing('Clovis', 'Money')])
      ).spread((r1, r2, r3, r4, r5) ->
        r1.should.not.be.null
        r2.should.not.be.null
        r3.should.not.be.null
        r4.should.not.be.null
        r5.should.not.be.null
      ).then(-> bb.all([
          client.get_commendations_for_user('Clovis')
        ])
      ).spread((r1) ->
        r1.should.not.be.null
        console.log("get_commendations_for_user -> ", r1)
      )
