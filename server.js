var bodyParser     = require('body-parser')
  , cons           = require('consolidate')
  , config         = require('config')
  , errorHandler   = require('errorhandler')
  , express        = require('express')
  , favicon        = require('serve-favicon')
  , logger         = require('morgan')
  , MongoStore     = require('connect-mongodb')
  , methodOverride = require('method-override')
  , multer         = require('multer')
  , sass           = require('node-sass')
  , session        = require('express-session')
  , cookieParser   = require('cookie-parser')
  , flash          = require('connect-flash')
  , events         = require('events')
  , passport       = require('passport')
  , TwitterStrategy= require('passport-twitter').Strategy
  ;

var dbConfig = config.get('dbConfig');

var dbInfo = {
  name: process.env.DB_NAME || dbConfig.name,
  url: process.env.DB_PATH || dbConfig.url,
  port: process.env.DB_PORT || dbConfig.port,
  username: process.env.DB_USER || dbConfig.username,
  password: process.env.DB_PASS || dbConfig.password,
  secret: process.env.SECRET || dbConfig.secret,
  cookieStr: dbConfig.cookieStr,
  collections: dbConfig.collections,
};

var app = express();

var conf = { 'port':(process.env.PORT || 1234), 'base':'' };

var mongo = new (require('./libs/Mongo').Mongo)(dbInfo);

//Custom Dust.JS helpers
var dust = require('dustjs-linkedin');
dust.helper = require('dustjs-helpers');
if (!dust.helpers) dust.helpers = {};

dust.helpers.formatIndex = function (chunk, context, bodies, params) {
  var text = dust.helpers.tap(params.value, chunk, context);
  text = text.split(';'),
  idx  = text[0],
  len  = text[1];
  var reversed = (idx - len) * -1;
  return chunk.write(reversed);
}

events.EventEmitter.prototype._maxListeners = 100;

mongo.connect(function(err) {

  if(err) console.dir(err)
  // assign dust engine to .dust files
  var template_engine = 'dust';

  app.set('port', conf.port);
  app.use(express.static(__dirname + '/public', {redirect: false}));
  app.use(express.static(__dirname + '/private', {redirect: false}));
  app.set('template_engine', template_engine);
  app.set('view engine', template_engine);
  app.engine(template_engine, cons.dust);
  app.set('views', __dirname + '/views');
  app.use(favicon(__dirname + '/public/favicon.ico')); 
  app.use(logger('dev'));
  app.use(methodOverride());
  app.use(cookieParser(dbInfo.secret));
  app.use(session({
    secret: dbInfo.secret,
    store: new MongoStore({
        db: mongo.getDB(),
        username: dbInfo.username,
        password: dbInfo.password,
        collection: 'admin-sessions'
    }),
    cookie: { maxAge: 24*60*60*1000 },
    resave: true,
    saveUninitialized: true
  }));
  app.use(flash());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended:true}));
  app.use(multer({dest:'./uploads/'}).single('singleInputFileName'));

  if('development' == app.get('env')){
    app.use(errorHandler());
  }

  var routes = {};

  var Index = require('./routes/index.js').initIndex;
  routes.Index = new Index(mongo);

  var Admin = require('./routes/admin.js').initAdmin;
  routes.Admin = new Admin(mongo);

  var twitterConfig = config.get('twitterConfig');

  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_KEY || twitterConfig.consumerKey,
    consumerSecret: process.env.TWITTER_SECRET || twitterConfig.consumerSecret,
    callbackURL: twitterConfig.callbackURL
  }, function(token, tokenSecret, profile, done) {
    console.log(token);
    console.log(tokenSecret);
    console.log(profile);

    done(null, profile);

    // User.findOrCreate(..., function(err, user) {
    //   if (err) { return done(err); }
    //   done(null, user);
    // });
  }));

  /* Middlewares */
  function requiresAdminLogin(req, res, next) {
    if( req.session.admin && req.session.loggedIn ){
        next();
    }
    else{
      res.redirect('/admin/login?returnurl=' + req.url);
    }
  };

  function requiresLoginAjax(req, res, next) {
    if( req.session.admin && req.session.loggedIn ){
      next();
    }
    else {
      res.status(403);
      res.send({success:false, error:'Not logged in'});
    }
  };
  
  // /* Dynamic helpers */
  // app.all('/admin/*', function( req, res, next ) {
  //   if( req.session.admin ){
  //     res.locals.admin = req.session.admin;
  //     res.locals.loggedIn = true;
  //     console.log('loggedIn');
  //   }
  //   next();
  // });

  app.get( '/', function( req, res, next ) { routes.Index.home( req, res, next ); } );
  app.get( '/leaderboard', function( req, res, next ) { routes.Index.leaderboard( req, res, next ); } );

  // app.get( '/popular', function( req, res, next ) { res.sendFile(__dirname+'/public/js/pop.json'); } );
  app.get( '/popular', function( req, res, next ) { routes.Index.popular( req, res, next ); } );

  app.get( '/search/:query', function( req, res, next ) { routes.Index.twitterSearch( req, res, next ); } );
  app.get( '/search', function( req, res, next ) { routes.Index.twitterSearchName( req, res, next ); } );
  app.get( '/userInfo', function( req, res, next ) { routes.Index.twitterGetUserInfo( req, res, next ); } );

  app.get( '/channel', function( req, res, next ) { routes.Index.getChannelInfo( req, res, next ); } );
  app.get( '/channel/tracks', function( req, res, next ) { routes.Index.getChannel( req, res, next ); } );
  app.post('/channel/tracks', function( req, res, next ) { routes.Index.incTracksPlayed( req, res, next ); } );

  // app.get( '/createPwd/:pwd', function( req, res, next ) { routes.Admin.createPwd( req, res, next ); } );

  // Admin dashboard routes.
  // app.get( '/admin/login', function( req, res, next ) { routes.Admin.login(     req, res, next ); } );
  // app.post('/admin/login', function( req, res, next ) { routes.Admin.postLogin( req, res, next ); } );
  // app.get( '/admin/logout',function( req, res, next ) { routes.Admin.logOut(    req, res, next ); } );  
  
  // app.get( '/admin', requiresAdminLogin, function( req, res, next ) { routes.Admin.home(  req, res, next ); } );
  // app.get( '/admin/admins', requiresAdminLogin, function( req, res, next ) { routes.Admin.adminUsers( req, res, next ); } );
  // app.get( '/admin/users',  requiresAdminLogin, function( req, res, next ) { routes.Admin.endUsers( req, res, next ); } );

  // app.post( '/admin/admins/add', requiresLoginAjax, function( req, res, next ) { routes.Admin.addAdmin( req, res, next ); } );
  // app.post( '/admin/admins/update', requiresLoginAjax, function( req, res, next ) { routes.Admin.updateAdmin( req, res, next ); } );
  // app.get( '/admin/admins/remove/:id', requiresAdminLogin, function( req, res, next ) { routes.Admin.removeAdmin( req, res, next ); } );
  // app.get( '/admin/bcrypt/:pwd', requiresAdminLogin, function( req, res, next ) { routes.Admin.createPwd(req, res, next ); } );

  // app.get( '/admin/js/:scriptFileName', requiresLoginAjax, function( req, res, next ) { routes.Admin.privateScript( req, res, next ); } ); 
  // app.get( '/admin/css/:styleFileName' , requiresLoginAjax, function( req, res, next ) { routes.Admin.privateStyle( req, res, next );  } ); 
  // app.get( '/admin/images/:imageFileName', requiresLoginAjax, function( req, res, next ) { routes.Admin.privateImage( req, res, next );  } ); 



  app.get("/*", function(req, res, next) { console.log(); res.redirect('/#'+req.originalUrl); }); //Handle 404
  app.listen(conf.port);
  console.log('Express server listening on port ' + conf.port);







  
});

module.exports = app;