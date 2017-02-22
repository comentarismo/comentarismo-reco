// const thinky = require('../js/thinky');

// const r = thinky.r;
// const type = thinky.type;

var Schema = function(thinky){
    const Items = thinky.createModel('items', {
        id: thinky.type.string(),
        thing: thinky.type.string()
    });

    const User = thinky.createModel('user', {
        id: thinky.type.string(),
        name: thinky.type.string()
    });

    const Likes = thinky.createModel('likes', {
        id: thinky.type.string().uuid(5),
        itemId: thinky.type.string(),
        userId: thinky.type.string()
    });

    Likes.belongsTo(User, 'user', 'userId', 'id');
    Likes.belongsTo(Items, 'items', 'itemId', 'id');
    User.hasMany(Likes, 'likes', 'id', 'userId');
    Items.hasMany(Likes, 'likes', 'id', 'itemId');

    var schema = {
        Items: Items,
        Likes: Likes,
        User: User
    };
    return schema;
}


// Relations

// Items.belongsTo(User, 'user', 'userId', 'id');
//User.hasMany(Items, 'items', 'id', 'userId');

module.exports = function(thinky){
    return new Schema(thinky)
};

// const Post = thinky.createModel('posts', {
//   id          : type.string(),
//   title       : type.string().required(),
//   image       : type.string().required(),
//   imageHeight : type.string(),
//   imageWidth  : type.string(),
//   createdAt   : type.date().default(r.now()),
//   authorId    : type.string().required()
// });
// Post.ensureIndex('createdAt');
//
// const Usery = thinky.createModel('users', {
//   username  : type.string().required(),
//   password  : type.string().required(),
//   salt      : type.string().required(),
//   createdAt : type.date().default(r.now())
// }, {
//   pk : 'username'
// });

// const Comment = thinky.createModel('comments', {
//   id        : type.string(),
//   content   : type.string().required(),
//   createdAt : type.date().default(r.now()),
//   authorId  : type.string().required(),
//   postId    : type.string().required()
// });
// Comment.ensureIndex('createdAt');

// const Likey = thinky.createModel('likes', {
//   id        : type.string(),
//   createdAt : type.date().default(r.now()),
//   authorId  : type.string().required(),
//   postId    : type.string().required()
// });

// Relations

// Post.belongsTo(User, 'author', 'authorId', 'username');
// Post.hasMany(Comment, 'comments', 'id', 'postId');
// Post.hasMany(Like, 'likes', 'id', 'postId');
//
// User.hasMany(Post, 'posts', 'id', 'authorId');
// User.hasMany(Comment, 'comments', 'id', 'authorId');
// User.hasMany(Like, 'likes', 'id', 'authorId');
//
// Comment.belongsTo(User, 'author', 'authorId', 'username');
// Comment.belongsTo(Post, 'post', 'postId', 'id');
//
// Like.belongsTo(User, 'author', 'authorId', 'username');
// Like.belongsTo(Post, 'post', 'postId', 'id');
//
// module.exports = {
//   Post,
//   User,
//   Comment,
//   Like
// };