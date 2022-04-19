var config = module.exports
var PRODUCTION = process.env.NODE_ENV === 'production'

config.express = {
  port: process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip:   process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'
}

config.mongodb = {
  port: process.env.MONGODB_PORT || 27017,
  host: process.env.MONGODB_HOST || 'localhost'
}
if (PRODUCTION) {
  // for example
  config.express.ip = '0.0.0.0'
}
// config.db same deal
// config.email etc
// config.log

var mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "",
    databaseServiceName = process.env.DATABASE_SERVICE_NAME || 'MONGODB';

if (mongoURL == null && databaseServiceName) {
  var mongoServiceName = databaseServiceName.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'] || 'localhost',
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'] || 27017,
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'] || 'tayronadb',
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  console.log('mongoServiceName = ' + mongoServiceName);
  console.log('mongoHost = '        + mongoHost       );
  console.log('mongoPort = '        + mongoPort       );
  console.log('mongoDatabase = '    + mongoDatabase   );
  console.log('mongoPassword = '    + mongoPassword   );
  console.log('mongoUser = '        + mongoUser       );
  
  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
   
var db = require('./routes/db')

db.connectToMongoDb(mongoURL, function(err) {
  if (err) {
    console.log('Unable to connect to Mongo.')
  } 
})