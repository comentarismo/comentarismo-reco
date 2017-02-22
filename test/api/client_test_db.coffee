#util = require('util')
#
#describe 'User recommendation routes', ->
#  describe 'User like things and get recommendations', ->
#    it 'should create users & things, like things, recommend thing for a user', ->
#      ns = random_namespace()
#      start_server.then(->
#        bb.all([
#          client.create_user(ns,'Edson')
#          client.create_user(ns,'Maria')
#          client.create_user(ns,'Francis')
#          client.create_user(ns,'Clovis')
#          client.create_user(ns,'John')
#        ])
#      ).spread((r1, r2, r3, r4, r5) ->
#        r1.should.not.be.null
#        r2.should.not.be.null
#        r3.should.not.be.null
#        r4.should.not.be.null
#        r5.should.not.be.null
#      ).then(-> bb.all([
#        client.create_thing(ns,'Book')
#        client.create_thing(ns,'Eat')
#        client.create_thing(ns,'Money')
#        client.create_thing(ns,'Beach')
#        client.create_thing(ns,'Beer')
#      ])).spread((r1, r2, r3, r4, r5) ->
#        r1.should.not.be.null
#        r2.should.not.be.null
#        r3.should.not.be.null
#        r4.should.not.be.null
#        r5.should.not.be.null
#      ).then(-> bb.all([
#        client.user_like_thing(ns,'Edson', 'Book')
#        client.user_like_thing(ns,'Edson', 'Eat')
#        client.user_like_thing(ns,'Edson', 'Money')
#        client.user_like_thing(ns,'Clovis', 'Beach')
#        client.user_like_thing(ns,'Clovis', 'Beer')
#        client.user_like_thing(ns,'Clovis', 'Money')])
#      ).spread((r1, r2, r3, r4, r5) ->
#        r1.should.not.be.null
#        r2.should.not.be.null
#        r3.should.not.be.null
#        r4.should.not.be.null
#        r5.should.not.be.null
#        console.log('r1 = ',r1)
#        r1.should.be.instanceof(Array).and.have.lengthOf(2);
#        msg = util.format("User %s liked item %s", 'Edson', 'Book')
#        console.log('msg',msg)
#        console.log('R USERS LIKES ', JSON.stringify(r1))
##        r1[0].should.be.an.instanceOf(Object).and.have.property('message', msg);
#
#      ).then(-> bb.all([
#        client.get_commendations_for_user('Clovis')
#      ])
#      ).spread((r1) ->
#        r1.should.not.be.null
#        console.log("get_commendations_for_user -> "+ r1)
#      ).then(-> bb.all([
#        client.user_likes('Edson')
#      ])
#      ).spread((r1) ->
#        r1.should.be.instanceof(Array)
#        console.log('USERS LIKES ', JSON.stringify(r1))
#      ).then(-> bb.all([
#        client.clear()
#      ])
#      ).spread((r1) ->
#        r1[0].should.be.an.instanceOf(Object).and.have.property('status', "ok");
#      )