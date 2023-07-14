var conn = require('../routes/db');
var helpers = require('../models/helpers')

function getOrjobsSpace (environment, callback) {
  helpers.validateEnvironment(environment, function(err){
    if (err) {callback(err)}
    else {
       var db = conn.getMongoDb();
       if (db == null) {
          callback('Unable to connecto to Mongo DB')
       } else {
          db.collection('orjobsSpace').find({ENVIRONMENT:environment}).toArray(function(err, result) {
            if (err) callback(err);
            db.collection('orjobsSpace').aggregate([{ $match: { ENVIRONMENT:environment } },{ $group: { _id: "$ENVIRONMENT", total: { $sum: "$SIZE_G" } } }]).toArray(function(t_err, totalSpace) {
               if (t_err) callback(t_err);

               if (result.length == 0) {
                  callback("No data found for " + environment + " tables.")}
               else {
                  var obj = new Object();
                  obj.spaceDetails = result;
                  obj.totalSpace = totalSpace;
                  callback(null, obj);
               }
            });
          }); 
       }
    };    
  });
}

function getOrjobsSpaceSummary (environment, filterType, callback) {
  helpers.validateEnvironment(environment, function(err){
    if (err) callback (err); 
    else {
      var groupBy =""
      var filterBy =""
      if (filterType == 'Client') {
        groupBy = "$CLIENT_NAME";
        filterBy = "CLIENT_NAME";
      }
      else if (filterType == 'Campaign'){
        groupBy  = "$CAMPAIGN_NAME";
        filterBy  = "CAMPAIGN_NAME";
      } else { filterType = "" };
      var db = conn.getMongoDb();
      if (db == null) {
          callback('Unable to connecto to Mongo DB')
      } else {
          db.collection('orjobsSpace').aggregate([
                    { $match: {ENVIRONMENT:environment} },
                    { $group: { _id: groupBy, SIZE_G: { $sum: "$SIZE_G" } } },
                    { $sort: { SIZE_G: -1 } }]).toArray(function(err, spaceDetails) {
                        if (err) callback(err);
                        db.collection('orjobsSpace').aggregate([{ $match: { ENVIRONMENT:environment}},{ $group: { _id: "$ENVIRONMENT", total: { $sum: "$SIZE_G" } } }]).toArray(function(t_err, totalSpace) {
                          if (t_err) callback(t_err);
                          if (spaceDetails.length == 0) {
                             callback("No data found for " + environment + " tables.")}
                          else {
                             var obj = new Object();
                             obj.spaceDetails = spaceDetails;
                             obj.totalSpace = totalSpace;
                             callback(null, obj);
                        }
      
                        });
                     });
        };              
      };
  });
}

function getOrjobsSpaceByFilter (environment, filterType, filterValue, callback) {
   var groupBy =""
   var filterBy =""
   if (filterType == 'Client') {
   groupBy = "$CLIENT_NAME";
   filterBy = "CLIENT_NAME";
   }
   else if (filterType == 'Campaign'){
   groupBy  = "$CAMPAIGN_NAME";
   filterBy  = "CAMPAIGN_NAME";
   } else { filterType = "" }
   
   if (filterValue == 'Unknown') {
   filterValue = null;
   }
   
   var db = conn.getMongoDb();
   if (db == null) {
      callback('Unable to connecto to Mongo DB')
   } else {
      if (environment == 'undefined') {
      db.collection('orjobsSpace').find({[filterBy]:filterValue}).sort( { 'SIZE_G': -1 } ).toArray(function(err, spaceDetails) {
         if (spaceDetails.length == 0 ) {
            callback('No information found for ' + filterBy + ' ' + filterValue);
         } else {
            db.collection('orjobsSpace').aggregate([{ $match: { [filterBy]:filterValue}},{ $group: { _id: filterBy, total: { $sum: "$SIZE_G" } } }]).toArray(function(t_err, totalSpace) {
               if (t_err) callback(t_err);
               var obj = new Object();
               obj.spaceDetails = spaceDetails;
               obj.totalSpace = totalSpace;
               callback(null, obj);
            });
         }
      });
      } else {
      db.collection('orjobsSpace').find({ENVIRONMENT:environment, [filterBy]:filterValue}).sort( { 'SIZE_G': -1 } ).toArray(function(err, spaceDetails) {
         if (spaceDetails.length == 0 ) {
            callback('No information found for ' + filterBy + ' ' + filterValue + ' in ' + environment);
         } else {
            db.collection('orjobsSpace').aggregate([{ $match: { ENVIRONMENT:environment, [filterBy]:filterValue}},{ $group: { _id: "$ENVIRONMENT", total: { $sum: "$SIZE_G" } } }]).toArray(function(t_err, totalSpace) {
            if (t_err) callback(t_err);
            var obj = new Object();
            obj.spaceDetails = spaceDetails;
            obj.totalSpace = totalSpace;
            callback(null, obj);
            });
         }
      });
   }
   }
}

function getEnvironentsTotalSpace (callback) {
  var db = conn.getMongoDb();
  if (db == null) {
      callback('Unable to connecto to Mongo DB')
  } else {
     db.collection('orjobsSpace').aggregate([{ $match: {} },{ $group: { _id: "$ENVIRONMENT", total: { $sum: "$SIZE_G" } } }]).toArray(function(err, totalSpace ){
       if (err) callback(err)
       else {
         callback(null, totalSpace);
       }
     });
  };
}

var convertSpaceToInt = function(document){
  var intValue = parseInt(document.SIZE_G, 10);
  var db = conn.getMongoDb();
  if (db == null) {
      callback('Unable to connecto to Mongo DB')
  } else {
     db.collection('orjobsSpace').update(
       {_id:document._id}, 
       {$set: {'SIZE_G': intValue}}
     );
  };
}


function saveTotalOrjobsSpaceByEnvironmentInPulse (environment) {
   var pulse = require('../models/pulse-model');
   var db = conn.getMongoDb();
   if (db == null) {
      callback('Unable to connecto to Mongo DB')
   } else {
      db.collection('orjobsSpace').aggregate([{ $match: {ENVIRONMENT: environment} },{ $group: { _id: "$ENVIRONMENT", total: { $sum: "$SIZE_G" } } }]).toArray(function(err, totalSpace ){
        if (err) { 
           console.log(err);
        } else {
           if (totalSpace.length > 0) {
              var sizeInTB = parseFloat(Number((totalSpace[0].total)/1024).toFixed(2));
              pulse.updateMultipleFieldInPulse(helpers.getCurrentDate(), environment, [['DB_ORJOBS_SIZE', sizeInTB]], function(err) {
                 if (err) { console.log(err); }
              });
           }
        }
      });
   }
}

function updateOrjobsSpaceByEnvironment (environment, callback) {
  helpers.validateEnvironment(environment, function(err){
    if (err) {callback(err)}
    else {
       var cn = null;
       var tableSpaceSQL = ''
       if (environment == 'Aggregation')
          cn = conn.getAggregationCn()
       else if (environment == 'Archives') {
          cn = conn.getArchivesCn()
          tableSpaceSQL = ' and a.TBSPACE not in (\'ORJOBS_D01\') '
       }
       else if (environment == 'Archives2') {
          cn = conn.getArchivesCn()
          tableSpaceSQL = ' and a.TBSPACE in (\'ORJOBS_D01\') '
       }
       else if (environment == '100pct')
          cn = conn.getAix100pctCn()
       else if (environment == '1pct')
          cn = conn.getAix1pctCn()
       else if (environment == 'Pinning') 
          cn = conn.getPinningCn()
       else {
          console.log('Invalid environment: ' + environment);
          callback('Invalid environment: ' + environment);          
       }
          
        var ibmdb = require('ibm_db');  
        
     	ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
     		if (err) {
              callback('error connecting to:' + environment+ '. Message' + err);
            } else {
     		
               var orjobsQuery = 'select \'' + environment + '\' as ENVIRONMENT, a.tabname TABLE_NAME, date(a.CREATE_TIME) AS CREATE_DATE, (a.fpages*PAGESIZE/1024/1024/1024) as SIZE_G from syscat.tables a, syscat.tablespaces b \
                                  where a.TBSPACEID=b.TBSPACEID  and a.card >= 0 and a.tabschema = \'ORJOBS01\'  and (a.fpages*PAGESIZE/1024/1024/1024) > 0 \ '
                                  + tableSpaceSQL + '  order by SIZE_G desc with ur;'
            
     		   connection.query(orjobsQuery, function (err, rows) {
     		     if (err) {
                    //console.log(orjobsQuery);
                    console.log(err);
                    callback(err);
                 } else {
                    connection.close();
                    var db = conn.getMongoDb();
                    if (db == null) {
                       callback('Unable to connecto to Mongo DB')
                    } else {
                       db.collection('orjobsSpace').deleteMany({ENVIRONMENT:environment}, function(err, dres) {
                         console.log(dres.deletedCount + ' ' + environment + ' documents deleted');
                         db.collection('orjobsSpace').insertMany(rows, function(err, ires) {
                           if (err) throw err;
                           console.log(ires.insertedCount +' ' + environment + ' ORJOBS01 tables Inserted');
                           db.collection('orjobsSpace').find({'SIZE_G': {$type:2}},{'SIZE_G':1}).forEach(convertSpaceToInt, function(uerr, ures){
                              if (uerr) throw uerr;
                              callback(null);
                           });
                         });
                       });
                    };
     		     }
     		   });
            }
     	});	
    };    
  });
}

function appendClientInfoToTable (table, account, callback) {
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
   } else {
      db.collection('campaignsInfo').findOne({'ACCOUNT':account},{'CLIENT_NAME':1} , function(err, cl_result) {
         if (err) throw err;
         if (cl_result) {
            db.collection('orjobsSpace').updateMany({'TABLE_NAME':table},
                                                   { $set: {'CLIENT_NAME'  : cl_result.CLIENT_NAME,
                                                            'ACCOUNT'      : account }
                                                      }, function(u_err, u_result) {
                                                         if (u_err) throw u_err;
                                                      });
            } else {
               console.log('No campaign information found by account number for table:' + table + ' - account:' + account);
            };                                           
      });   
   } 
 }

var appendCampaignInfoToTable = function(document){
  var myCampaignIDRegexp = /_C+C[A-Z0-9]+_/g;
  var matchByCampaignID = myCampaignIDRegexp.exec(document.TABLE_NAME);
  
  var myAccountNumberRegexp = /^A[A-Z0-9]+_/g;
  var matchByAccount = myAccountNumberRegexp.exec(document.TABLE_NAME);

  if (matchByCampaignID != null) {
    var campaignCD = matchByCampaignID[0].slice(2,-1); 
    var db = conn.getMongoDb();
    if (db == null) {
       callback('Unable to connecto to Mongo DB')
    } else {
       db.collection('campaignsInfo').find({'CAMPAIGN_CD':campaignCD},{}).toArray(function(cl_err, cl_result) {
          if (cl_err) throw cl_err;
          if (cl_result.length > 0) {
             db.collection('orjobsSpace').updateMany({'TABLE_NAME':document.TABLE_NAME},
                                                    { $set: {'CLIENT_NAME'  : cl_result[0].CLIENT_NAME,
                                                             'CAMPAIGN_ID'  : cl_result[0].CAMPAIGN_ID, 
                                                             'ACCOUNT'      : cl_result[0].ACCOUNT,   
                                                             'CAMPAIGN_NAME': cl_result[0].CAMPAIGN_NAME,
                                                             'CAMPAIGN_CD'  : cl_result[0].CAMPAIGN_CD,
                                                             'USER_NAME'    : cl_result[0].USER_NAME, }
                                                     }, function(u_err, u_result) {
                                                          if (u_err) throw u_err;
                                                     });
           } else {
              
              if (matchByAccount != null) {
               var account = matchByAccount[0].slice(1,-1); 
               appendClientInfoToTable(document.TABLE_NAME, account, function(err) {
                  if (err) { console.log(err); }
               });
              } else {
                 console.log('No information derived from table name :' + document.TABLE_NAME);
              }
           };                                           
       });
    };
  }  else if (matchByAccount != null) {
      var account = matchByAccount[0].slice(1,-1); 
      appendClientInfoToTable(document.TABLE_NAME, account, function(err) {
         if (err) { console.log(err); }
      });
   }
}

function updateTablesWithCampaignsInfo (callback) {
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
   } else {
      db.collection('orjobsSpace').find({},{}).forEach(appendCampaignInfoToTable, function(err, ures){
         if (err) throw err;
         callback(null);
      }); 
   };      
}

exports.getOrjobsSpace = getOrjobsSpace;
exports.getOrjobsSpaceSummary = getOrjobsSpaceSummary;
exports.getOrjobsSpaceByFilter = getOrjobsSpaceByFilter;
exports.getEnvironentsTotalSpace = getEnvironentsTotalSpace;
exports.updateOrjobsSpaceByEnvironment = updateOrjobsSpaceByEnvironment;
exports.updateTablesWithCampaignsInfo = updateTablesWithCampaignsInfo;
exports.saveTotalOrjobsSpaceByEnvironmentInPulse = saveTotalOrjobsSpaceByEnvironmentInPulse;