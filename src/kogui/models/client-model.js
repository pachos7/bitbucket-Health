var helpers = require('./helpers')

function getClientsList (callback) {
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB');
    } else {
      db.collection('clients').find({},{}).toArray(function(err, clientsList) {
        if (err) callback(err);
        callback(null, clientsList);
      });
    };
}

function getClientsDeliveryMappingsList (callback) {
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB');
    } else {
      db.collection('clients').find({'ASCEND_DELIVERY_MAPPING':{ $exists: true}}).sort({'ENVIRONMENT':1, 'CLIENT_NAME':1}).toArray(function(err, deliveryMappingList) {
        if (err) callback(err);
        callback(null, deliveryMappingList);
      });
    };
}

function insertNewClientDeliveryMapping(data, callback) {
   var conn = require('../routes/db');
   var cn = null

   if (data.environmentSelect == 'Prod') {
      cn = conn.getMetadataCn();
   } else if (data.environmentSelect == 'UAT') {
      cn = conn.getUATMetadataCn();
   } else {
      callback('Invalid environment to create new Delivery Mapping:' + data.environmentSelect)
   }
   
   var baseQuery = ' INSERT INTO ATLAS.ASCEND_CLIENT_MAPPING (CLIENT_ID, DELIVER_METHOD, DESTINATION_LOCATION, STS_INTERMEDIATE_S3_PATH, PROFILE_NAME, DSN_NAME) \
                     VALUES(' + data.clientId + ', ' + data.methodSelect + ', ' +  (data.destination == '' ? 'NULL' : '\'' + data.destination + '\'') + ', ' +  (data.stsPath == '' ? 'NULL' : '\'' + data.stsPath + '\'') + ', ' + (data.profileName == '' ? 'NULL' : '\'' + data.profileName + '\'') + ', ' + (data.dsnName == '' ? 'NULL' : '\'' + data.dsnName + '\'') + ');'

   Promise.all([helpers.executeQueryPromise(cn, baseQuery)])
   .then(results => {
      var db = conn.getMongoDb();
      if (db == null) {
         callback('Unable to connecto to Mongo DB');
      } else {
         var method = null
              if (data.methodSelect == 1) method = 'S3'
         else if (data.methodSelect == 2) method = 'STS'
         else if (data.methodSelect == 3) method = 'CONNECT_DIRECT'

         var element = {
            "DELIVER_METHOD" : method,
            "DESTINATION_LOCATION" : (data.destination == '' ? null : data.destination),
            "STS_INTERMEDIATE_S3_PATH" : (data.stsPath == '' ? null : data.stsPath),
            "PROFILE_NAME" : (data.profileName == '' ? null : data.profileName),
            "DSN_NAME" : (data.dsnName == '' ? null : data.dsnName),
            "CLIENT_NAME" : (data.clientName.startsWith("[UAT]") ? data.clientName.substring(5) : data.clientName)
        }

         updateAscendMapping([element], data.environmentSelect, function(err) {
            if (err) { callback(err) }
            else { callback(null) }
         });
      };
   }).catch(function(err) {
      callback(err);
   });
                 
}

function validateNewDeliveryMapping (data, callback) {
   if (data.destination == "") {
      callback('Destination Location can\'t be empty')
   } else if (data.methodSelect == 1) {   //S3
      if (data.profileName == "") {
         callback('Profile Name can\'t be empty')
      } else callback()
   } else if (data.methodSelect == 2) {  //STS
      if (data.stsPath == "") {
         callback('STS Intermediate S3 path can\'t be empty')
      } else if (data.dsnName == "") {
            callback('DSN Name can\'t be empty')
      } else callback()
   } else if (data.methodSelect == 3) {  //CONNECT_DIRECT
      if (data.stsPath == "") {
         callback('STS Intermediate S3 path can\'t be empty')
      } else callback()
   } else {
      callback('Invalid delivery method:' + data.methodSelect)
   }
}

function insertClients(clientsList, environment, callback) {
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
    } else {
      clientsCount = clientsList.length
      clientsUpserted = 0
      clientsList.forEach(element => {
         db.collection('clients').update({ CLIENT_NAME: element.CLIENT_NAME, ENVIRONMENT: environment}, 
            { $set: {CLIENT_ID: element.CLIENT_ID}}, 
            { upsert: true }, function(err, res) {                                 
               if (err) callback(err);
               clientsUpserted += 1
               if (clientsUpserted == clientsCount) {
                  callback(null);
                }
            });
         });
   }
}

function updateClientsList (callback) {
   var conn = require('../routes/db');
   var cn = conn.getMetadataCn();
   var cn_uat = conn.getUATMetadataCn();
   
   var baseQuery = 'SELECT CLIENT_ID, CLIENT_NAME FROM ATLAS.CLIENT WITH UR FOR READ ONLY;'
   Promise.all([helpers.executeQueryPromise(cn, baseQuery), helpers.executeQueryPromise(cn_uat, baseQuery)])
    .then(results => {
       var db = conn.getMongoDb();
       if (db == null) {
          callback('Unable to connecto to Mongo DB');
       } else {
          db.collection('clients').drop(function(err, dres) {
            insertClients(results[0], "Prod", function(err) {
               if (err) callback(err);
               insertClients(results[1], "UAT", function(err) {
                  if (err) callback(err);
                  getClientAscendMapping(function(err) {
                     if (err) callback(err);
                     callback(null);
                  })
               });
            });
          });
       };
 
    }).catch(function(err) {
       callback(err);
    });
 }

 function updateAscendMapping(clientsMappingList, environment, callback) {
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
    } else {
      clientsMappingCount = clientsMappingList.length
      clientsMappingUpdated = 0
      clientsMappingList.forEach(element => {
         db.collection('clients').update({ CLIENT_NAME: element.CLIENT_NAME, ENVIRONMENT: environment}, 
            { $push: {ASCEND_DELIVERY_MAPPING: element}}, 
            { upsert: true }, function(err, res) {                                 
               if (err) callback(err);
               clientsMappingUpdated += 1
               if (clientsMappingUpdated == clientsMappingCount) {
                  callback(null);
                }
            });
         });
   }
}


 function getClientAscendMapping (callback) {
   var conn = require('../routes/db');
   var cn = conn.getMetadataCn();
   var cn_uat = conn.getUATMetadataCn();
   
   var baseQuery = 'SELECT CASE DELIVER_METHOD WHEN 1 THEN \'S3\' WHEN 2 THEN \'STS\' WHEN 3 THEN \'CONNECT DIRECT\' ELSE \'?\' END as DELIVER_METHOD, DESTINATION_LOCATION, STS_INTERMEDIATE_S3_PATH, PROFILE_NAME, DSN_NAME, CLIENT_NAME \
                    FROM ATLAS.ASCEND_CLIENT_MAPPING A, ATLAS.CLIENT B  WHERE A.CLIENT_ID = B.CLIENT_ID  WITH UR FOR READ ONLY; '

   Promise.all([helpers.executeQueryPromise(cn, baseQuery), helpers.executeQueryPromise(cn_uat, baseQuery)])
    .then(results => {
       var db = conn.getMongoDb();
       if (db == null) {
         callback('Unable to connecto to Mongo DB');
       } else {
         updateAscendMapping(results[0], "Prod", function(err) {
            if (err) callback(err);
            updateAscendMapping(results[1], "UAT", function(err) {
               if (err) callback(err);
               callback(null);
            });
         });
       };
 
    }).catch(function(err) {
       callback(err);
    });
 }

function getClientDetailsData (clientName, callback) {
   
   environment = "Prod"
   if (clientName.startsWith("[UAT]")) {
      clientName = clientName.substring(5)
      environment = "UAT"
   }  
   
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
 
   if (db == null) {
       callback('Unable to connecto to Mongo DB');
    } else {
      db.collection('clients').find({'CLIENT_NAME':clientName, 'ENVIRONMENT': environment}).toArray(function(err, result) {
        if (err) { 
           callback(err) 
        };
          callback(null, result[0]);
      });
    }
 }


exports.getClientsList = getClientsList;
exports.updateClientsList = updateClientsList;
exports.getClientDetailsData = getClientDetailsData;
exports.getClientsDeliveryMappingsList = getClientsDeliveryMappingsList;
exports.validateNewDeliveryMapping = validateNewDeliveryMapping;
exports.insertNewClientDeliveryMapping = insertNewClientDeliveryMapping;