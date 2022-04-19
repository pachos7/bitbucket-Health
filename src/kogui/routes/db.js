var mongodb = require('mongodb');

var state = {
  mongoDb: null,
  metadataCn: null,
  aggregationCn: null,
  archivesCn: null,
  aix100pctCn: null,
  aix1pctCn: null,
  pinningCn: null,
  appUserName: null,
  appLinuxPassword: null,
  appAIXPassword: null,
}

exports.connectToMongoDb = function(mongoURL, done) {
  if (state.mongoDb) return done()

  if (mongoURL == null) return;
  
  var mongodb = require('mongodb');
  if (mongodb == null) return;
  
  mongodb.connect(mongoURL, function(err, mongoDb) {
    if (err) return done(err)
    state.mongoDb = mongoDb;
    console.log('Connected to MongoDB at: %s', mongoURL);
    done();
  })
}

// Get personal credentials from paramaters 
var	myArgs = process.argv.slice(2);

if (myArgs.length < 3) {
	console.log('No user name and password provided by paramater');
  	state.appUserName      = process.env.APP_USER           || null;
	state.appLinuxPassword = process.env.APP_LINUX_PASSWORD || null;
    state.appAIXPassword   = process.env.APP_AIX_PASSWORD   || null;
} else {
	state.appUserName = myArgs[0];
	state.appLinuxPassword = myArgs[1];
    state.appAIXPassword = myArgs[2];
}

var metadataService = process.env.APP_METADATA_SERVICE || process.env.OPENSHIFT_APP_METADATA_SERVICE  ||'APPMETADATA';

var Instance = process.env.INSTANCE || process.env.INSTANCE  ||'PROD';
//Instance = 'UAT'
if (metadataService) {    
    if (Instance == 'PROD' || Instance == 'UAT') {
      var metadataDbHost =     process.env[metadataService + '_SERVICE_HOST'] || '192.168.215.24',
          metadataDbPort =     process.env[metadataService + '_SERVICE_PORT'] || 50000,
          metadataDbDatabase = process.env[metadataService + '_DATABASE'] || 'ORMSPDB1', 
          metadataDbPassword = process.env[metadataService + '_PASSWORD'] || state.appAIXPassword,
          metadataDbUser =     process.env[metadataService + '_USER']     || state.appUserName,
          metadataDbCredentials = "UID=" + metadataDbUser + ";PWD=" + metadataDbPassword,
          metadataDbConnectionString = "DRIVER={DB2};DATABASE=" + metadataDbDatabase + ";HOSTNAME=" + metadataDbHost + ";PORT=" + metadataDbPort + ";PROTOCOL=TCPIP;" ;
          state.metadataCn = metadataDbConnectionString + metadataDbCredentials;
      
      var metadataDbHost =     process.env[metadataService + '_SERVICE_HOST'] || '192.168.215.24',
          metadataDbPort =     process.env[metadataService + '_SERVICE_PORT'] || 50000,
          metadataDbDatabase = process.env[metadataService + '_DATABASE'] || 'APPPDB1',
          metadataDbPassword = process.env[metadataService + '_PASSWORD'] || state.appAIXPassword,
          metadataDbUser =     process.env[metadataService + '_USER']     || state.appUserName,
          metadataDbCredentials = "UID=" + metadataDbUser + ";PWD=" + metadataDbPassword,
          metadataDbConnectionString = "DRIVER={DB2};DATABASE=" + metadataDbDatabase + ";HOSTNAME=" + metadataDbHost + ";PORT=" + metadataDbPort + ";PROTOCOL=TCPIP;" ;
          state.uatMetadataCn = metadataDbConnectionString + metadataDbCredentials;

    } else if (Instance == 'TEST') {
      var metadataDbHost =     process.env[metadataService + '_SERVICE_HOST'] || '10.10.188.46',
          metadataDbPort =     process.env[metadataService + '_SERVICE_PORT'] || 53000,
          metadataDbDatabase = process.env[metadataService + '_DATABASE'] || 'ORMSTDB1',
          metadataDbPassword = process.env[metadataService + '_PASSWORD'] || state.appAIXPassword,
          metadataDbUser =     process.env[metadataService + '_USER']     || state.appUserName,
          metadataDbCredentials = "UID=" + metadataDbUser + ";PWD=" + metadataDbPassword,
          metadataDbConnectionString = "DRIVER={DB2};DATABASE=" + metadataDbDatabase + ";HOSTNAME=" + metadataDbHost + ";PORT=" + metadataDbPort + ";PROTOCOL=TCPIP;" ;
          
          state.metadataCn = metadataDbConnectionString + metadataDbCredentials;
          state.uatMetadataCn = metadataDbConnectionString + metadataDbCredentials;
                
    } else  {
      console.log('Invalid Instance parameter "' + Instance + '" it needs to be PROD, UAT or TEST')
      process.exit(10)
    }

    console.log('connected to  ' + Instance + ' metadata');
    console.log('metadataConnectionString = ' + metadataDbConnectionString);
}


var aggDb = process.env.APP_AGGDB || process.env.OPENSHIFT_APP_AGGDB  ||'AGGDB';

if (aggDb) {    
    var aggDbHost = process.env[aggDb + '_SERVICE_HOST'] || '10.8.30.151',
        aggDbPort = process.env[aggDb + '_SERVICE_PORT'] || 50000,
        aggDbDatabase = process.env[aggDb + '_DATABASE'] || 'ORAGPDB2',
        aggDbPassword = process.env[aggDb + '_PASSWORD'] || state.appLinuxPassword,
        aggDbUser = process.env[aggDb + '_USER']         || state.appUserName,
        aggDbCredentials = "UID=" + aggDbUser + ";PWD=" + aggDbPassword,
        aggDbConnectionString = "DRIVER={DB2};DATABASE=" + aggDbDatabase + ";HOSTNAME=" + aggDbHost + ";PORT=" + aggDbPort + ";PROTOCOL=TCPIP;" ;
        
    state.aggregationCn = aggDbConnectionString + aggDbCredentials;
    console.log('aggDbConnectionString = ' + aggDbConnectionString);
}

var archDb = process.env.APP_ARCHDB || process.env.OPENSHIFT_APP_ARCHDB  ||'ARCHDB';

if (archDb) {    
    var archDbHost = process.env[archDb + '_SERVICE_HOST'] || '10.8.30.151',
        archDbPort = process.env[archDb + '_SERVICE_PORT'] || 50000,
        archDbDatabase = process.env[archDb + '_DATABASE'] || 'ARCHPDB2',
        archDbPassword = process.env[archDb + '_PASSWORD'] || state.appLinuxPassword,
        archDbUser = process.env[archDb + '_USER']         || state.appUserName,
        archDbCredentials = "UID=" + archDbUser + ";PWD=" + archDbPassword,
        archDbConnectionString = "DRIVER={DB2};DATABASE=" + archDbDatabase + ";HOSTNAME=" + archDbHost + ";PORT=" + archDbPort + ";PROTOCOL=TCPIP;" ;
    
    state.archivesCn = archDbConnectionString + archDbCredentials;
    console.log('archDbConnectionString = ' + archDbConnectionString);
}

var aix100pctDb = process.env.APP_AIX100PCTDB || process.env.OPENSHIFT_APP_AIX100PCTDB  ||'AIX100PCTDB';

if (aix100pctDb) {    
    var aix100pctDbHost = process.env[aix100pctDb + '_SERVICE_HOST'] || '192.168.215.1',
        aix100pctDbPort = process.env[aix100pctDb + '_SERVICE_PORT'] || 50000,
        aix100pctDbDatabase = process.env[aix100pctDb + '_DATABASE'] || 'ORDWPDB1',
        aix100pctDbPassword = process.env[aix100pctDb + '_PASSWORD'] || state.appAIXPassword,
        aix100pctDbUser = process.env[aix100pctDb + '_USER']         || state.appUserName,
        aix100pctDbCredentials = "UID=" + aix100pctDbUser + ";PWD=" + aix100pctDbPassword,
        aix100pctDbConnectionString = "DRIVER={DB2};DATABASE=" + aix100pctDbDatabase + ";HOSTNAME=" + aix100pctDbHost + ";PORT=" + aix100pctDbPort + ";PROTOCOL=TCPIP;" ;
    
    console.log('aix100pctDbConnectionString = ' + aix100pctDbConnectionString);
    state.aix100pctCn = aix100pctDbConnectionString + aix100pctDbCredentials;
}   

var aix1pctDb = process.env.APP_AIX1PCTDB || process.env.OPENSHIFT_APP_AIX1PCTDB  ||'AIX1PCTDB';

if (aix1pctDb) {    
    var aix1pctDbHost = process.env[aix100pctDb + '_SERVICE_HOST'] || '192.168.215.24',
        aix1pctDbPort = process.env[aix100pctDb + '_SERVICE_PORT'] || 51000,
        aix1pctDbDatabase = process.env[aix100pctDb + '_DATABASE'] || 'ORJDPDB1',
        aix1pctDbPassword = process.env[aix100pctDb + '_PASSWORD'] || state.appAIXPassword,
        aix1pctDbUser = process.env[aix100pctDb + '_USER']         || state.appUserName,
        aix1pctDbCredentials = "UID=" + aix1pctDbUser + ";PWD=" + aix1pctDbPassword,
        aix1pctDbConnectionString = "DRIVER={DB2};DATABASE=" + aix1pctDbDatabase + ";HOSTNAME=" + aix1pctDbHost + ";PORT=" + aix1pctDbPort + ";PROTOCOL=TCPIP;" ;
    
    console.log('aix1pctDbConnectionString = ' + aix1pctDbConnectionString);
    state.aix1pctCn = aix1pctDbConnectionString + aix1pctDbCredentials;
}   

var pinningDb = process.env.APP_PINNINGDB || process.env.OPENSHIFT_APP_PINNINGDB  ||'PINNINGDB';

if (pinningDb) {    
  var pinningDbHost = process.env[pinningDb + '_SERVICE_HOST'] || '192.168.215.15',
      pinningDbPort = process.env[pinningDb + '_SERVICE_PORT'] || 50000,
      pinningDbDatabase = process.env[pinningDb + '_DATABASE'] || 'ORPSPDB1',
      pinningDbPassword = process.env[pinningDb + '_PASSWORD'] || state.appAIXPassword,
      pinningDbUser = process.env[pinningDb + '_USER']         || state.appUserName,
      pinningDbCredentials = "UID=" + pinningDbUser + ";PWD=" + pinningDbPassword,
      pinningDbConnectionString = "DRIVER={DB2};DATABASE=" + pinningDbDatabase + ";HOSTNAME=" + pinningDbHost + ";PORT=" + pinningDbPort + ";PROTOCOL=TCPIP;" ;
  
  console.log('pinningDbConnectionString = ' + pinningDbConnectionString);
  state.pinningCn = pinningDbConnectionString + pinningDbCredentials;
}  

exports.getMongoDb = function() {  return state.mongoDb }
exports.getAggregationCn = function() {  return state.aggregationCn }
exports.getArchivesCn = function() {  return state.archivesCn }
exports.getAix100pctCn = function() {  return state.aix100pctCn }
exports.getAix1pctCn = function() {  return state.aix1pctCn }
exports.getPinningCn = function() {  return state.pinningCn }
exports.getMetadataCn = function() {  return state.metadataCn }
exports.getUATMetadataCn = function() {  return state.uatMetadataCn }
exports.getLinuxDbUserName = function() {  return state.appUserName }
exports.getLinuxDbPassword = function() {  return state.appLinuxPassword }
exports.getAIXDbUserName = function() {  return state.appUserName }
exports.getAIXDbPassword = function() {  return state.appAIXPassword }


exports.close = function(done) {
  if (state.mongoDb) {
    state.mongoDb.close(function(err, result) {
      state.mongoDb = null
      state.mode = null
      done(err)
    })
  }
}

