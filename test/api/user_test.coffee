##mocha --opts test/db/mocha.opts test/db/user_test.coffee
#global.User    = require('../../js/schema').User;
#global.Items    = require('../../js/schema').Items;
#global.Likes    = require('../../js/schema').Likes;
#
#thinky = require('thinky')();
#
#
#
#
#describe 'User create user', ->
#  describe 'User list ', ->
##    it 'should delete existing users ', ->
##      bb.all([
##        User.get('1').delete()
##      ]).spread((r1) ->
##        r1.should.not.be.null
##      )
##    it 'should delete existing items ', ->
##      bb.all([
##        Items.get('1').delete()
##      ]).spread((r1) ->
##        r1.should.not.be.null
##      )
##    it 'should delete existing likes ', ->
##      bb.all([
##        Likes.get('1').delete()
##      ]).spread((r1) ->
##        r1.should.not.be.null
##      )
#    it 'should create users ', ->
#      user   = new User({
#        name    : 'Odie'
#      });
#      bb.all([
#        User.save(user , {conflict:'update'})
#      ]).spread((r1) ->
#        r1.should.not.be.null
#        global.id = r1.id
#      ).then(->bb.all([
#        User.get(id).run()
#      ])).spread((r2) ->
#        r2.should.not.be.null
#      )
#      .then(->bb.all([
#        User.get(id).delete()
#      ])).spread((r3) ->
#        r3.should.not.be.null
#      )
#    it 'should create itens ', ->
#      items   = new Items({
#        thing    : 'T-shirt',
#      });
#      bb.all([
#        Items.save(items , {conflict:'update'})
#      ]).spread((r1) ->
#        r1.should.not.be.null
#        global.id = r1.id
#      ).then(->bb.all([
#        Items.get(id).run()
#      ])).spread((r2) ->
#        r2.should.not.be.null
#      )
#      .then(->bb.all([
#        Items.get(id).delete()
#      ])).spread((r3) ->
#        r3.should.not.be.null
#      )
#    it 'should create likes ', ->
#      user   = new User({
#        id      : 'Odie',
#        name    : 'Odie'
#      });
#      items   = new Items({
#        id       : 'T-shirt',
#        thing    : 'T-shirt'
#      });
#      likes   = new Likes({
#        id :   thinky.r.uuid(user.id+items.id)
#      });
#      likes.user = user
#      likes.items = items
#      bb.all([
#        likes.saveAll( {user : true, items: true } ,{ conflict:'update'})
#      ]).spread((r1) ->
#        r1.should.not.be.null
#        global.idLike = r1.id
#        console.log('global.idLike ', global.idLike)
#      ).then(->bb.all([
##       Model.filter({id: doc.id}).getJoin().run()
#        Likes.get(idLike).getJoin().run()
#      ])).spread((r2) ->
#        r2.should.not.be.null
##        assert likes.user
##        assert likes.items
#        r2.user.name.should.not.be.null
#        r2.items.thing.should.not.be.null
#        r2.user.should.have.property('name', 'Odie');
#
#        global.idUser = r2.user.id
#        global.idItens = r2.items.id
#
#      )
#      .then(->bb.all([
#        Likes.get(idLike).delete()
#        User.get(idUser).delete()
#        Items.get(idItens).delete()
#      ])).spread((r3) ->
#        r3.should.not.be.null
#      )