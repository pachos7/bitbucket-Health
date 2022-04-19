var conn = require('../routes/db');
var db = conn.getMongoDb();

function getMostRecentPulse(callback) {
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
   } else {
      db.collection('pulse').find({},{"DATE":1}).sort({'DATE':-1}).limit(1).toArray(function (err, mostRecentDate) {
         if (err) callback(err);
         
         if (mostRecentDate[0] == undefined) {
            callback('No Pulse Data found');
         } else {
            db.collection('pulse').find({ DATE: mostRecentDate[0].DATE}).sort({"ENVIRONMENT": 1}).toArray(function (err, pulse) {
               if (err) callback(err);
               callback(null, pulse);
            });
         }
      });
   };
}

function isArray (value) {
   return value && typeof value === 'object' && value.constructor === Array;
}

function createBasePulse(pulseDate, pulseEnvironment, callback) {
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
    } else {
      db.collection('pulse').update({ DATE: pulseDate, ENVIRONMENT: pulseEnvironment}, 
                                    { $set: {DATE: pulseDate, ENVIRONMENT: pulseEnvironment}}, 
                                    { upsert: true }, function(err, res) {                                 
          if (err) callback(err);
          callback(null);
      });
   };
}

function updateMultipleFieldInPulse(pulseDate, pulseEnvironment, dataArray, callback) {
   if (isArray(dataArray)) {
     createBasePulse(pulseDate, pulseEnvironment, function(err) {
        if (err) callback(err);
        dataArray.forEach(function(element, idx) {
           var pulseFieldName = element[0];
           var pulseFieldValue = element[1];
           if (db == null) {
              callback('Unable to connecto to Mongo DB')
           } else {
              db.collection('pulse').update({ DATE: pulseDate, ENVIRONMENT: pulseEnvironment}, 
                                            { $set: {[pulseFieldName]:  pulseFieldValue}}, 
                                            { upsert: true }, function(err, res) {                                 
                  if (err) callback(err);
                  if (idx === dataArray.length - 1) {
                     callback(null);
                  }
              });
           };
        });
     });
   } else {
     callback('Invalid data Array:' + dataArray);
   }
}

exports.getMostRecentPulse = getMostRecentPulse;
exports.updateMultipleFieldInPulse = updateMultipleFieldInPulse;