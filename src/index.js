// Project Specification
// Create a blogging application that allows users to do the following:
// - register an account
// - login
// - logout

// Once logged in, a user should be able to:
// - create a post
// - view a list of their own posts
// - view a list of everyone's posts
// - view a specific post, including the comments people have made about it
// - leave a comment on a post

// Prior to coding, determine the following:
// - your tables: what columns will they have? How will they connect to one another?
// - make a diagram showing the relationships between tables.
// - your routes: what routes should you have? What should each route do?
// Once you are done designing your application, then proceed with coding.
// Submit this document in a text file as part of your application.

// Other requirements:
// Your routes must be "RESTful". See slide 4 of the http requests lecture: Link. Also look at the RESTful routing example in the 
// node sample apps.
// You must use Sequelize for this assignment. Your connection string must once again be read from the environment variables you 
// set up for the Bulletin Board assignment.
// Commit well - each commit should ideally be a new piece of functionality.

// Hints:

// sequelize.sync()
// is a Promise that creates your tables if they do not already exist. Call this one time prior to starting up the server.

// sequelize.sync({force: true})
// is a Promise that deletes your tables first, then recreates them. Use this if you have changed the structure of your tables.

// Later on, we'll learn about migrations, which will allow us to modify our tables without losing our data.

// Requiring packages
const Sequelize = require('sequelize')
const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const SequelizeStore = require('connect-session-sequelize')(session.Store);


// CONFIG dependencies
//process.env.POSTGRES_USER
//BLOGAPP
const index = express()
const sequelize = new Sequelize('blogapp', 'postgres', null, {
    host: 'localhost',
    dialect: 'postgres',
    storage: './session.postgres'
})

index.use(express.static('public'))

index.set('views', 'src/views')
index.set('view engine', 'ejs')

index.use(bodyParser.urlencoded({
    extended: true
}))

index.use(session({
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds.
        expiration: 7 * 24 * 60 * 60 * 1000 // The maximum age (in milliseconds) of a valid session.
    }),
    secret: "abacate",
    saveUnitialized: true,
    resave: false
}))

//Defining models (tables in the blogapp database)
const User = sequelize.define('users', {
    user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: {
                args: [2, 150],
                msg: 'Please enter a username between 2 and 150 characters'
            }
        }
    },
    email: {
        type: Sequelize.STRING,
        unique: true,
        isEmail: true,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            len: {
                args: [8, 150],
                msg: 'Please enter password with at least 8 characters'
            }
        }
    }
})

const Post = sequelize.define('posts', {
    post_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: Sequelize.STRING,
        validate: {
            len: {
                args: [2, 150],
                msg: 'Please enter a title between 2 and 150 characters'
            }
        }
    },
    body: {
        type: Sequelize.TEXT,
        notEmpty: true,
        allowNull: false
    }
})

const Comment = sequelize.define('comments', {
    comment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    comment: {
        type: Sequelize.TEXT,
        notEmpty: true,
        allowNull: false
    }
})

// TABLES RELATIONSHIP/ASSOCIATION
User.hasMany(Post)
Post.belongsTo(User)

User.hasMany(Comment)
Comment.belongsTo(User)

Post.hasMany(Comment)
Comment.belongsTo(Post)

// Routes

// Home route
index.get('/', (req, res) => {
    res.status(200).render("home")
});

//Oops route
index.get('/oops', (req, res) => {
    res.render("oops")
});


// Register route with validation

index.get('/register', (req, res) => {
    res.status(200).render("register")
});

//using validation route to validate unique username in front-end AJAX
index.post('/validation', (req,res) =>{
    var username = req.body.username
    User.findOne({
        where: {
            username: username
        }
    })
    .then( user =>{
        if (user === null){
            res.send(true)
        }else{
            res.send(false)
        }
    })
})


index.post('/register', (req, res) => {

    var inputusername = req.body.username
    var inputemail = req.body.email
    var inputpassword = req.body.password

    User.create({
            username: inputusername,
            email: inputemail,
            password: inputpassword
        }).then(() => {
            res.status(307).redirect('/login');
        })
        .catch((err) => {
            console.log(err, err.stack)
            res.status(400).redirect('/oops')
        })
})

//Log In route
index.get('/login', (req, res) => {
    res.status(200).render("login")
});

index.post('/login', (req, res) => {

    var email = req.body.email;
    var password = req.body.password;

    //console.log(email, password);

    if (email.length === 0) {
        res.redirect('/oops')
        return;
    }

    if (password.length === 0) {
        res.redirect('/oops');
        return;
    }

    User.findOne({
        where: {
            email: email
        }
    }).then(function (user) {

        if (user !== null && password === user.password) {
            req.session.user = user;
            res.redirect('/post');
        } else {
            res.redirect('/oops')
        }
    }).catch((err) => {
        console.log(err, err.stack)
        res.redirect('/oops')
    })
});

// Log Out route

index.get('/logout', (req, res) => {
    req.session.destroy(function (error) {
        if (error) {
            throw error;
        }
        res.render('logout');
    })
})

// See all posts route ==> /post

index.get('/post', (req, res) => {
    const user = req.session.user;

    if (user === undefined) {
        res.redirect('/oops')
        return;
    };
    //see about ordering the posts from newer to older
    Post.findAll({
            order: [
                ['createdAt', 'DESC']
            ],
            include: [{
                model: User
            }],
        })
        .then((posts) => {
            //console.log(posts)
            res.render('allposts', {
                posts: posts,
                user: user
            })
        }).catch((err) => {
            console.log(err, err.stack)
            res.redirect('/oops')
        })
})


// Add post route == /post/new

index.get('/post/new', (req, res) => {
    const user = req.session.user;

    if (user === undefined) {
        res.redirect('/oops')
        return;
    } else {
        res.render("addpost");
    }
});

index.post('/post/new', (req, res) => {

    const user = req.session.user;
    //console.log(req.session)
    if (user === undefined) {
        res.redirect('/oops')
        return;
    }

    var username = req.session.user.username;
    var inputTitle = req.body.title;
    var inputBody = req.body.body;

    User.findOne({
            where: {
                username: username
            }
        })
        .then(function (user) {
            return user.createPost({
                title: inputTitle,
                body: inputBody
            })
        })
        .then(post => {
            //console.log(post)
            res.redirect(`/post/${post.post_id}`);
        }).catch((err) => {
            console.log(err, err.stack)
            res.redirect('/oops')
        })
});

// User's post route ==> /post/user/my 

index.get('/post/my', (req, res) => {
    const user = req.session.user
    if (user === undefined) {
        res.redirect('/oops')
        return;
    }

    const userid = user.user_id

    Post.findAll({
            order: [
                ['createdAt', 'DESC']
            ],
            where: {
                userUserId: userid
            },
            include: [{
                model: User
            }],
        })
        .then((posts) => {
            //console.log(posts)
            res.render('userpost', {
                posts: posts,
                user: user
            })
        }).catch((err) => {
            console.log(err, err.stack)
            res.redirect('/oops')
        })
})

// See an specific post ==> /post/:post_id ==> NEEDS DEBUGGING
index.get('/post/:post_id', (req, res) => {

    const post_id = req.params.post_id;
    //console.log(post_id)
    // var posts;
    // var comments;


    var p1 = Post.findOne({
        where: {
            post_id: post_id
        },
        include: [{
            model: User
        }, {
            model: Comment
        }]
    })
    // .then((post) => {
    //     posts = post
    // });

    var p2 = Comment.findAll({
        order: [
            ['createdAt', 'DESC']
        ],
        where: {
            postPostId: post_id
        },
        include: [{
            model: User
        }]
    })
    // .then((comment) => {
    //     comments = comment
    // });
    Promise.all([p1, p2])
        .then(all => {
            var posts, comments;
            [posts, comments] = all;

            // console.log('all ________________', all)
            // console.log('comments ________________', comments)
            // console.log('posts ________________', posts)
            res.render("specificpost", {
                comments: comments,
                posts: posts
            });
        })
        .catch((err) => {
            console.log(err, err.stack)
            res.redirect('/oops')
        })
});

index.post('/post/:post_id', (req, res) => {
    var userid = req.session.user.user_id;
    var inputComment = req.body.comment;
    console.log('----------------------------------', inputComment)
    const post_id = req.params.post_id;
    console.log(post_id)

    Post.findOne({
            where: {
                post_id: post_id
            }
        })
        .then((post) => {
            return post.createComment({
                comment: inputComment,
                userUserId: userid
            })
        })
        .then(function (comments) {
            console.log(comments)
            res.redirect(`/post/${post_id}`)
        }).catch((err) => {
            console.log(err, err.stack)
            res.redirect('/oops')
        })

})


// Creating tables in the database

sequelize.sync()

// Setting up Express server

index.listen(3333, function () {
    console.log("Here on port 3333")
})