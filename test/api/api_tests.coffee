#node_modules/.bin/mocha --opts test/api/mocha.opts test/api/api_tests.coffee

describe 'User recommendation routes', ->
  describe 'User like things and get recommendations', ->
    it 'should create users & things, like things, recommend thing for a user', ->
      ns = random_namespace()
#      ns = "comentarismo"
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

      image = [
          {image:"http://greatist.com/sites/default/files/running.jpg"},
          {image:"http://images.gr-assets.com/books/1453417993l/10534.jpg"},
          {image:"http://bendcitychurch.org/wp-content/uploads/2013/07/eat-more-sandwich.jpg?w=640"},
          {image:"http://animal-dream.com/data_images/money/money3.jpg"},
          {image:"https://thedimlight.files.wordpress.com/2012/07/harem.jpg"},
          {image:"http://www.exotisiv.com/sites/default/files/swimming-pigs-beach-bahamas-2.jpg"},
          {image:"https://s-media-cache-ak0.pinimg.com/originals/d3/2b/67/d32b671cb16540444292901f29d3f098.jpg"},
          {image:"http://jornalggn.com.br/sites/default/files/u16-2016/fotortemertrofeu.jpg"},
          {image:"http://jornalggn.com.br/sites/default/files/u19146/640px-foratemer.jpg"},
          {image:"https://static.independent.co.uk/s3fs-public/thumbnails/image/2016/10/28/16/gettyimages-1134009.jpg"}
      ]

      start_server.then(->
        client.create_namespace(ns)
      ).then(->
        client.clear(ns)
      ).then(->
        bb.all([
          client.create_user(ns,'Edson','EdsonID')
          client.create_user(ns,'Maria','MariaID')
          client.create_user(ns,'Francis','FrancisID')
          client.create_user(ns,'John','JohnID')
          client.create_user(ns,'Clovis','ClovisID')
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
        client.create_thing(ns,'Run', image[0].image,image[0].image, "RunID")
        client.create_thing(ns,'Book', image[1].image,image[1].image, "BookID")
        client.create_thing(ns,'Eat', image[2].image,image[2].image, "EatID")
        client.create_thing(ns,'Money', image[3].image,image[3].image, "MoneyID")
        client.create_thing(ns,'Girls', image[4].image,image[4].image, "GirlsID")
        client.create_thing(ns,'Beach', image[5].image,image[5].image, "BeachID")
        client.create_thing(ns,'Beer', image[6].image,image[6].image, "BeerID")
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
        client.clear(ns)
      )
      .then(->
        client.destroy_namespace(ns)
      )

    it 'should not create things without namespace, thing, image, link', ->
      ns = random_namespace()
      t = undefined
      client.create_thing(ns, t, t ,t , t)
      .then( ->
        throw "SHOULD NOT GET HERE"
      ).catch(RECOClient.Not200Error, (e) ->
        e.status.should.equal 400
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