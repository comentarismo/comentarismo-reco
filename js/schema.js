var Schema = function(thinky){
    const Items = thinky.createModel('items', {
        id: thinky.type.string(),
        thing: thinky.type.string(),
        namespace: thinky.type.string(),
        image: thinky.type.string(),
        link: thinky.type.string(),
    });

    const User = thinky.createModel('user', {
        id: thinky.type.string(),
        name: thinky.type.string(),
        namespace: thinky.type.string()
    });

    const Likes = thinky.createModel('likes', {
        id: thinky.type.string().uuid(5),
        itemId: thinky.type.string(),
        userId: thinky.type.string(),
        namespace: thinky.type.string()
    });

    Likes.belongsTo(User, 'user', 'userId', 'id');
    Likes.belongsTo(Items, 'items', 'itemId', 'id');
    User.hasMany(Likes, 'likes', 'id', 'userId');
    Items.hasMany(Likes, 'likes', 'id', 'itemId');
    
    Likes.ensureIndex("namespace")
    User.ensureIndex("namespace")
    Items.ensureIndex("namespace")
    
    
    var schema = {
        Items: Items,
        Likes: Likes,
        User: User
    };
    return schema;
};

module.exports = function(thinky){
    return new Schema(thinky)
};