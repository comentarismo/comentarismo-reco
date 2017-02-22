#mocha --opts test/api/mocha.opts test/api/api_tests.coffee

describe 'User recommendation routes', ->
  describe 'User like things and get recommendations', ->
    it 'should create users & things, like things, recommend thing for a user', ->
      ns = random_namespace()
      client.clear().then(->

        start_server.then(->
          client.create_namespace(ns)
        ).then(->
          bb.all([
            client.create_user(ns,'Edson')
            client.create_user(ns,'Maria')
            client.create_user(ns,'Francis')
            client.create_user(ns,'Clovis')
            client.create_user(ns,'John')
          ])
        ).spread((r1, r2, r3, r4, r5) ->
          r1.should.not.be.null
          r2.should.not.be.null
          r3.should.not.be.null
          r4.should.not.be.null
          r5.should.not.be.null
        ).then(-> bb.all([
          client.create_thing(ns,'Book')
          client.create_thing(ns,'Eat')
          client.create_thing(ns,'Money')
          client.create_thing(ns,'Beach')
          client.create_thing(ns,'Beer')
        ])).spread((r1, r2, r3, r4, r5) ->
          r1.should.not.be.null
          r2.should.not.be.null
          r3.should.not.be.null
          r4.should.not.be.null
          r5.should.not.be.null
        ).then(-> bb.all([
          client.user_like_thing(ns,'Edson', 'Run')
          client.user_like_thing(ns,'Edson', 'Book')
          client.user_like_thing(ns,'Edson', 'Eat')
          client.user_like_thing(ns,'Edson', 'Money')
          client.user_like_thing(ns,'Edson', 'Girls')

          client.user_like_thing(ns,'Clovis', 'Beach')
          client.user_like_thing(ns,'Clovis', 'Beer')
          client.user_like_thing(ns,'Clovis', 'Girls')
          client.user_like_thing(ns,'Clovis', 'Money')
          ])
        ).spread((r1, r2, r3, r4, r5) ->
          r1.should.not.be.null
          r2.should.not.be.null
          r3.should.not.be.null
          r4.should.not.be.null
          r5.should.not.be.null
        ).then(-> bb.all([
          client.get_commendations_for_user(ns,'Clovis')
        ])
        ).spread((r1) ->
          r1.should.not.be.null
          console.log("get_commendations_for_user -> ", r1)
          r1.should.not.be.null
          r1[0].recommendations.should.be.instanceof(Array).and.have.lengthOf(5)
#          r1[0].recommendations[0].should.have.property('thing', 'Money')
#          r1[0].recommendations[1].should.have.property('thing', 'Beer')
#          r1[0].recommendations[2].should.have.property('thing', 'Beach')
#          r1[0].recommendations[3].should.have.property('thing', 'Eat')
#          r1[0].recommendations[4].should.have.property('thing', 'Book')
          bb.all([
            client.get_commendations_for_thing(ns,'Beer')
            client.get_commendations_for_thing(ns,'Money')
          ])
        ).spread((r1, r2) ->
          r1.should.not.be.null
          r2.should.not.be.null
          r1[0].recommendations.should.be.instanceof(Array).and.have.lengthOf(2)
          r2[0].recommendations.should.be.instanceof(Array).and.have.lengthOf(4)

#          r1[0].recommendations[0].should.have.property('thing', 'Beach')
#          r1[0].recommendations[1].should.have.property('thing', 'Money')
#          r2[0].recommendations[0].should.have.property('thing', 'Money')
        ).then(->
          client.destroy_namespace(ns)
        )
      )