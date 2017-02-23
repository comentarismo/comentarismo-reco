#node_modules/.bin/mocha --opts test/api/mocha.opts test/api/api_tests.coffee

describe 'User recommendation routes', ->
  describe 'User like things and get recommendations', ->
    it 'should create users & things, like things, recommend thing for a user', ->
      ns = random_namespace()
      edsonID = ""
      mariaID = ""
      francisID = ""
      johnID = ""
      clovisID = ""

      runID = ""
      bookID = ""
      eatID = ""
      moneyID = ""
      girlsID = ""
      beachID = ""
      beerID = ""

      start_server.then(->
        client.create_namespace(ns)
      ).then(->
        client.clear()
      ).then(->
        bb.all([
          client.create_user(ns,'Edson')
          client.create_user(ns,'Maria')
          client.create_user(ns,'Francis')
          client.create_user(ns,'John')
          client.create_user(ns,'Clovis')
        ])
      ).spread((r1, r2, r3, r4, r5) ->
        should.exist(r1)
        should.exist(r2)
        should.exist(r3)
        should.exist(r4)
        should.exist(r5)

        r1[0].id.should.not.be.null
        edsonID = r1[0].id

        r2[0].id.should.not.be.null
        mariaID = r2[0].id

        r3[0].id.should.not.be.null
        francisID = r3[0].id

        r4[0].id.should.not.be.null
        johnID = r4[0].id

        r5[0].id.should.not.be.null
        clovisID = r5[0].id

      ).then(-> bb.all([
        client.create_thing(ns,'Run')
        client.create_thing(ns,'Book')
        client.create_thing(ns,'Eat')
        client.create_thing(ns,'Money')
        client.create_thing(ns,'Girls')
        client.create_thing(ns,'Beach')
        client.create_thing(ns,'Beer')
      ])).spread((r1, r2, r3, r4, r5,r6,r7) ->
        should.exist(r1)
        should.exist(r2)
        should.exist(r3)
        should.exist(r4)
        should.exist(r5)
        should.exist(r6)
        should.exist(r7)

        r1[0].id.should.not.be.null
        runID = r1[0].id

        r2[0].id.should.not.be.null
        bookID = r2[0].id

        r3[0].id.should.not.be.null
        eatID = r3[0].id

        r4[0].id.should.not.be.null
        moneyID = r4[0].id

        r5[0].id.should.not.be.null
        girlsID = r5[0].id

        r6[0].id.should.not.be.null
        beachID = r6[0].id

        r7[0].id.should.not.be.null
        beerID = r7[0].id

      ).then(-> bb.all([
        client.user_like_thing(ns, edsonID, runID)
        client.user_like_thing(ns, edsonID, bookID)
        client.user_like_thing(ns, edsonID, eatID)

        #common ground
        client.user_like_thing(ns, edsonID, moneyID)
        client.user_like_thing(ns, edsonID, girlsID)

        client.user_like_thing(ns ,edsonID, beachID)
        client.user_like_thing(ns, edsonID, beerID)

        #common ground
        client.user_like_thing(ns,clovisID, girlsID)
        client.user_like_thing(ns,clovisID, moneyID)

        client.user_like_thing(ns,mariaID, bookID)
      ])
      ).spread((r1, r2, r3, r4, r5,r6,r7,r8,r9,r10) ->
        should.exist(r1)
        r1.should.have.lengthOf(2)
        r1[0].should.have.property('id')

        should.exist(r2)
        r2.should.have.lengthOf(2)
        r2[0].should.have.property('id')

        should.exist(r3)
        r3.should.have.lengthOf(2)
        r3[0].should.have.property('id')

        should.exist(r4)
        r4.should.have.lengthOf(2)
        r4[0].should.have.property('id')

        should.exist(r5)
        r5.should.have.lengthOf(2)
        r5[0].should.have.property('id')

        should.exist(r6)
        r6.should.have.lengthOf(2)
        r6[0].should.have.property('id')

        should.exist(r7)
        r7.should.have.lengthOf(2)
        r7[0].should.have.property('id')

        should.exist(r8)
        r8.should.have.lengthOf(2)
        r8[0].should.have.property('id')

        should.exist(r9)
        r9.should.have.lengthOf(2)
        r9[0].should.have.property('id')

        should.exist(r10)
        r10.should.have.lengthOf(2)
        r10[0].should.have.property('id')


        global.likeId1 = r1[0].id
        global.likeId2 = r2[0].id
        global.likeId3 = r3[0].id
        global.likeId4 = r4[0].id
        global.likeId5 = r5[0].id
        global.likeId6 = r6[0].id
        global.likeId7 = r7[0].id
        global.likeId8 = r8[0].id
        global.likeId9 = r9[0].id
        global.likeId10 = r10[0].id
      ).then(->
        bb.all([
          client.user_likes(ns,mariaID)
        ])
      ).spread((r1) ->
        should.exist(r1)
        console.log(r1[0])
        r1[0].likes.should.be.instanceof(Array)
        expect(r1[0].likes[0]).that.deep.equals({id:likeId10, itemId: bookID, namespace: ns, userId: mariaID})
      )
      .then(-> bb.all([
        client.get_commendations_for_user(ns,clovisID)
      ])
      ).spread((r1) ->
        r1.should.not.be.null
        r1.should.not.be.null
        r1[0].recommendations.should.be.instanceof(Array)
        r1[0].recommendations.length.should.be.greaterThan(4)

        bb.all([
          client.get_commendations_for_thing(ns,beerID)
          client.get_commendations_for_thing(ns,moneyID)
        ])
      ).spread((r1, r2) ->
        r1.should.not.be.null
        r2.should.not.be.null
        r1[0].recommendations.should.be.instanceof(Array)
        r1[0].recommendations.length.should.be.greaterThan(5)

        r2[0].recommendations.should.be.instanceof(Array)
        r2[0].recommendations.length.should.be.greaterThan(5)

      ).then(->
        client.destroy_namespace(ns)
      )

    it 'should start, check health, stop server and start again', ->
      start_server.then(->
        bb.all([
          client.health()
          client.index()
        ])
      ).spread((r1,r2) ->
        should.exist(r1)
        should.exist(r2)
      ).then(->
        server.stop()
      ).delay(500).then(->
        server.start()
      ).delay(5000)