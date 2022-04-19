const { escapeSelector } = require('jquery');
var helpers = require('./helpers')

function getCampaignDetails (campaignName, callback) {
  var conn = require('../routes/db');
  var db = conn.getMongoDb();

  if (db == null) {
      callback('Unable to connecto to Mongo DB');
   } else {
     db.collection('campaignsInfo').find({'CAMPAIGN_NAME':campaignName}).toArray(function(err, result) {
       if (err) { 
          callback(err) 
       };
       if (result === 'undefined' || result === null || result.length == 0) {
         getSingleCampaignInfoFromMetadata(campaignName, function (err, this_result) {
            if (err) callback(err);
            callback(null, campaignName, this_result);
         })
       } else {
         callback(null, campaignName, result);
       }
       
     });
   }
}

function updateAllCampaignsExecutionInfo (callback) {
    // Create a filter of the campaigns we would like to update
    var conn = require('../routes/db');
    var db = conn.getMongoDb();
    if (db == null) {
       callback('Unable to connecto to Mongo DB')
    } else {
       db.collection('orjobsSpace').aggregate([
                         { $match: {CAMPAIGN_ID: {$ne:null}} },
                         { $group: { _id: "$CAMPAIGN_ID"} }]).toArray(function(err, campaignIDs) {
               if (err) callback(err);          
               var campaignsFilter = ''
               campaignIDs.forEach(function (thisRow) {
                   campaignsFilter += thisRow._id + ','
               });
               campaignsFilter += '0000000' // Add dummy last campaign ID to avoid issues with last ','
               
               updateCampaignWithExecutionInfo(campaignsFilter, function (err) {
                   if (err) callback(err);
                   callback(null);
               });
       });
    }
}   

appEnvironmentsCase = " CASE B.ENVIRONMENT_ID \
                         WHEN 4 THEN '1pct' \
                         WHEN 10 THEN '1pct' \
                         WHEN 11 THEN '100pct' \
                         WHEN 53 THEN 'Pinning' \
                         WHEN 133 THEN 'Aggregation' \
                         WHEN 134 THEN 'Archives' \
                         WHEN 173 THEN 'Post ETL - Aggregation' \
                         WHEN 233 THEN 'Post ETL - 100pct' \
                         WHEN 273 THEN 'Ascend_Pinning' \
                         WHEN 274 THEN 'Ascend_Archives' \
                         WHEN 275 THEN 'Ascend_Daily_Aggregation' \
                         WHEN 285 THEN 'Ascend_1pct' \
                         ELSE 'Other' END as ENVIRONMENT, "

appEnvironmentsList = " 4, 10, 11, 53, 133, 134, 173, 233, 273, 274, 275, 285 "

function updateSingleCampaignExecutionDetails (campaignName, callback) {
  var conn = require('../routes/db');
  var cn = conn.getMetadataCn();
  var ibmdb = require('ibm_db');

  queryCampaignName = campaignName
  if (queryCampaignName.startsWith("[UAT]")) {
     queryCampaignName = queryCampaignName.substring(5)
     cn = conn.getUATMetadataCn();
  }  

  ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
    if (err) {
        callback('error connecting to Metadata Db:' + err);
     } else {    

        
        var query = "Select CAMPAIGN_ID, RUN_INSTANCE_ID as RUN_INSTANCE, " + appEnvironmentsCase + "\
                     CASE JOB_STATUS_CD WHEN 0 THEN 'ILLEGAL_STATE_BASELINE_REQUIRED'  WHEN 1 THEN 'Submitted' WHEN 2 THEN 'Executing' WHEN 3 THEN 'Cancelled' WHEN 4 THEN 'Success' WHEN 5 THEN 'Failed' WHEN 6 THEN 'Hold' WHEN 7 THEN 'Hold' WHEN 8 THEN 'Hold' WHEN 9 THEN 'Waiting_for_Slot' WHEN 10 THEN 'Hold' WHEN 11 THEN 'Deliver_Hold' ELSE '?' END as STATUS,\
                     START_TS, END_TS, DATE(LOAD_VIEW_END_TS) AS DB2_TRADE_BASE_DT, DAILY_DATA_DT AS ASCEND_TRADE_BASE_DT \
                     from atlas.job_Queue B where ENVIRONMENT_ID in ( " + appEnvironmentsList + " )\
                     and CAMPAIGN_ID in (Select ARTIFACT_ID from ATLAS.ARTIFACT where ARTIFACT_NAME = '" + queryCampaignName + "') order by START_TS desc\
                     WITH UR FOR READ ONLY;"
        connection.query(query, function (err, rows) {
           if (err) {
              callback (' updateSingleCampaignExecutionDetails error:' + err)
           } else {
              connection.close();
              var db = conn.getMongoDb();
              if (db == null) {
                 callback('Unable to connecto to Mongo DB')
              } else {
                 db.collection('campaignsInfo').updateMany({'CAMPAIGN_NAME':campaignName},   { $unset: { EXECUTIONS: "" }}, function(err, us_result) {
                     if (err) callback(err);
                     var rowsProcessed = 0;
                     if (rows.length > 0) {
                        rows.forEach(function (EXECUTIONS) {
                           db.collection('campaignsInfo').updateMany({'CAMPAIGN_ID':EXECUTIONS.CAMPAIGN_ID},{$push: {EXECUTIONS}}, function(err, u2_result) {
                              if (err) callback(err);
                              rowsProcessed++;
                              if(rowsProcessed === rows.length) {
                                 console.log(rows.length + ' Execution added to campaign ' + campaignName);
                                 callback();
                              }
                           });
                        });
                     } else {
                       callback('No executions found on DB for this campaign');
                     }
                 });
              };
          }
        });
      }
	});	
} 

function processDataExtract(rows, callback){
   rowsProcessed = 0
   tasks = []
   xml2js = require('xml2js');
   var parser = new xml2js.Parser();
   rows.forEach(function (PROCESS) {
      xml = PROCESS.TASK_PROCESS_STATUS
      parser.parseString(xml, function (err, result) {
         taskDetails = result['taskexecdata:TaskExecution']['$'] 
         taskProcesses = result['taskexecdata:TaskExecution']['processes']

         tasks.push({'TASK_ID': PROCESS.TASK_ID,'TASK_NAME': PROCESS.TASK_NAME ,'TASK_STATUS': taskDetails.status, 'TASK_START': taskDetails.start, 'TASK_END': taskDetails.end, 'TASK_PROCESSES': taskProcesses})
         rowsProcessed++;
         if(rowsProcessed === rows.length) {
             callback(null, tasks);
         }
   
      });

   });
}

function getRunInstanceDetails (runInstance, callback) {
   var conn = require('../routes/db');
   
   cn = conn.getMetadataCn();

   queryRunInstance = runInstance
   if (runInstance.startsWith("[UAT]")) {
      queryRunInstance = runInstance.substring(5)
      cn = conn.getUATMetadataCn();
   } 

   var baseQuery = "SELECT " + appEnvironmentsCase + "\
      D.CLIENT_NAME,\
      A.ACCOUNT_NUMBER,\
      var_campaign AS CAMPAIGN_NAME,\
      CASE JOB_STATUS_CD WHEN 0 THEN 'ILLEGAL_STATE_BASELINE_REQUIRED'  WHEN 1 THEN 'Submitted' WHEN 2 THEN 'Executing' WHEN 3 THEN 'Cancelled' WHEN 4 THEN 'Success' WHEN 5 THEN 'Failed' WHEN 6 THEN 'Hold' WHEN 7 THEN 'Hold' WHEN 8 THEN 'Hold' WHEN 9 THEN 'Waiting_for_Slot' WHEN 10 THEN 'Hold' WHEN 11 THEN 'Deliver_Hold' ELSE '?' END as STATUS,\
      DATE(B.LOAD_VIEW_END_TS) AS DB2_TRADE_BASE_DT, \
      B.DAILY_DATA_DT AS ASCEND_TRADE_BASE_DT, \
      C.TASK_ID, \
      C.TASK_PROCESS_STATUS, \
      T.TASK_NAME \
   FROM atlas.CAMPAIGN A, \
      atlas.JOB_QUEUE B, \
      atlas.JOB_QUEUE_DETAIL C, \
      atlas.CLIENT D, \
      atlas.ACCOUNT_NUMBER E, \
      atlas.ARTIFACT F, \
      atlas.CAMPAIGN_DATA G, \
      XMLTABLE ('for $e in $d/*/plans/tasks return $e' passing xmlparse(document G.CAMPAIGN_DATA) as \"d\" \
               COLUMNS  \"TASK_ID\" VARCHAR(100) PATH '@taskID', \
                        \"TASK_NAME\" VARCHAR(100) PATH '@name' \
               ) as T \
   WHERE A.ARTIFACT_ID=B.CAMPAIGN_ID AND \
      B.JOB_QUEUE_ID=C.JOB_QUEUE_ID AND \
      D.CLIENT_ID=E.CLIENT_ID AND \
      A.ACCOUNT_NUMBER=E.ACCOUNT_NUMBER AND \
      A.ARTIFACT_ID=F.ARTIFACT_ID AND \
      A.ARTIFACT_ID = G.CAMPAIGN_ID AND \
      C.TASK_ID = T.TASK_ID AND \
      B.RUN_INSTANCE_ID='" + queryRunInstance + "' \
      ORDER BY C.EXEC_SEQ_NB ASC \
   WITH UR FOR READ ONLY; "

   var query = '';

   if (runInstance.startsWith("[UAT]")) {
      query = baseQuery.replace('var_campaign', ' \'[UAT]\' || F.ARTIFACT_NAME')
   }  else {
      query = baseQuery.replace('var_campaign', 'F.ARTIFACT_NAME')
   }

   Promise.all([helpers.executeQueryPromise(cn, query)])
   .then(results => {
      rows = results[0]
      if (rows.length > 0) {
         campaignInformation = rows[0]
         campaignInformation = {'ENVIRONMENT': rows[0].ENVIRONMENT ,
                                'CLIENT_NAME': rows[0].CLIENT_NAME,
                                'ACCOUNT_NUMBER': rows[0].ACCOUNT_NUMBER,
                                'CAMPAIGN_NAME': rows[0].CAMPAIGN_NAME,
                                'STATUS': rows[0].STATUS,
                                'DB2_TRADE_BASE_DT': rows[0].DB2_TRADE_BASE_DT,
                                'ASCEND_TRADE_BASE_DT': rows[0].ASCEND_TRADE_BASE_DT}
         processes = []
         processDataExtract(rows, function(err, processes) { 
            if (err) { callback(err); }
            callback(null, campaignInformation, processes);
         }); 
      } else {
        callback('No details found for this run Instance');
      }
   }).catch(function(err) {
      callback(' getRunInstanceDetails error:' + err);
      console.log(err)
   });
 } 
 

var updateCampaignWithExecutionInfo = function(campaignsFilter, callback){
  var conn = require('../routes/db');
  var cn = conn.getMetadataCn();
  var ibmdb = require('ibm_db');
    
  ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
    if (err) {
        callback('error connecting to Metadata Db:' + err);
     } else {    
        
        var fromDate = '2018-01-01'
        var query = "Select CAMPAIGN_ID, RUN_INSTANCE_ID as RUN_INSTANCE, " + appEnvironmentsCase + "\
                     CASE JOB_STATUS_CD WHEN 0 THEN 'ILLEGAL_STATE_BASELINE_REQUIRED'  WHEN 1 THEN 'Submitted' WHEN 2 THEN 'Executing' WHEN 3 THEN 'Cancelled' WHEN 4 THEN 'Success' WHEN 5 THEN 'Failed' WHEN 6 THEN 'Hold' WHEN 7 THEN 'Hold' WHEN 8 THEN 'Hold' WHEN 9 THEN 'Waiting_for_Slot' WHEN 10 THEN 'Hold' WHEN 11 THEN 'Deliver_Hold' ELSE '?' END as STATUS,\
                     START_TS, END_TS, DATE(LOAD_VIEW_END_TS) AS DB2_TRADE_BASE_DT, DAILY_DATA_DT AS ASCEND_TRADE_BASE_DT \
                     from atlas.job_Queue B where DATE (START_TS) >= '" + fromDate + "'  and ENVIRONMENT_ID in ( " + appEnvironmentsList + " )\
                     and CAMPAIGN_ID in (" + campaignsFilter + ") order by START_TS desc\
                     WITH UR FOR READ ONLY;"
        
        connection.query(query, function (err, rows) {
           if (err) {
              callback (' updateAllCampaignsExecutionInfo error:' + err)
           } else {
              connection.close();
              var rowsProcessed = 0;
              console.log('Updating local db with ' + rows.length + ' execution details extracted from remote metadata')
              callback();
              rows.forEach(function (EXECUTIONS) {
                 var db = conn.getMongoDb();
                 if (db == null) {
                    callback('Unable to connecto to Mongo DB')
                 } else {
                    db.collection('campaignsInfo').updateMany({'CAMPAIGN_ID':EXECUTIONS.CAMPAIGN_ID},{$push: {EXECUTIONS}}, function(err) {
                       if (err) console.log('ERROR updating Campaigns info:' + err)
                    });
                 };
              });
           }
        });
      }
	});	  
};


function updateCampaignsFromMetadataByAccountNumber (accountNumber, callback) {
   var conn = require('../routes/db');
   var cn = conn.getMetadataCn();
   var cn_uat = conn.getUATMetadataCn();
   
   var baseQuery = 'select a.ARTIFACT_ID as CAMPAIGN_ID, client_name as CLIENT_NAME, a.ACCOUNT_NUMBER as ACCOUNT,  var_campaignName as CAMPAIGN_NAME , CAMPAIGN_CD, u.USER_NAME\
   from ATLAS.artifact a, ATLAS.client c, atlas.campaign k, atlas.user u\
   where a.CLIENT_ID = c.CLIENT_ID and a.ARTIFACT_ID = k.ARtifact_ID and a.UPD_USER_ID = u.USER_ID \
    AND a.ACCOUNT_NUMBER = ' + accountNumber + ' WITH UR FOR READ ONLY;'
 
   var query = baseQuery.replace('var_campaignName', ' ARTIFACT_NAME ')
   var query_uat = baseQuery.replace('var_campaignName', ' \'[UAT]\' || ARTIFACT_NAME')

   Promise.all([helpers.executeQueryPromise(cn, query), helpers.executeQueryPromise(cn_uat, query_uat)])
    .then(results => {
       var db = conn.getMongoDb();
       if (db == null) {
          callback('Unable to connecto to Mongo DB');
       } else {
          db.collection('campaignsInfo').deleteMany({'ACCOUNT':accountNumber}  , function(err, dres) {
             db.collection('campaignsInfo').insertMany(results[0], function(err, res) {
               if (err) callback(err);
               console.log('Number of Campaign PROD documents inserted for account: ' + accountNumber + ' ' + res.insertedCount);
               if (results[1].length > 0) {
                  db.collection('campaignsInfo').insertMany(results[1], function(err, res) {
                     if (err) callback(err);
                     console.log('Number of Campaign UAT documents inserted: for account: ' + accountNumber + ' ' + res.insertedCount);
                     callback(null);
                     });     
               } else {
                  callback(null);
               }
             });
          });
       };
 
    }).catch(function(err) {
       callback(err);
    });
 }

function getCampaignsInfoFromMetadata (callback) {
  var conn = require('../routes/db');
  var cn = conn.getMetadataCn();
  var cn_uat = conn.getUATMetadataCn();
  
  var baseQuery = 'select a.ARTIFACT_ID as CAMPAIGN_ID, client_name as CLIENT_NAME, a.ACCOUNT_NUMBER as ACCOUNT,  var_campaignName as CAMPAIGN_NAME , CAMPAIGN_CD, u.USER_NAME\
  from ATLAS.artifact a, ATLAS.client c, atlas.campaign k, atlas.user u\
  where a.CLIENT_ID = c.CLIENT_ID and a.ARTIFACT_ID = k.ARtifact_ID and a.UPD_USER_ID = u.USER_ID WITH UR FOR READ ONLY;'

  var query = baseQuery.replace('var_campaignName', ' ARTIFACT_NAME ')
  var query_uat = baseQuery.replace('var_campaignName', ' \'[UAT]\' || ARTIFACT_NAME')

  Promise.all([helpers.executeQueryPromise(cn, query), helpers.executeQueryPromise(cn_uat, query_uat)])
   .then(results => {
      var db = conn.getMongoDb();
      if (db == null) {
         callback('Unable to connecto to Mongo DB');
      } else {
         db.collection('campaignsInfo').drop(function(err, dres) {
            db.collection('campaignsInfo').insertMany(results[0], function(err, res) {
              if (err) callback(err);
              console.log('Number of Campaign PROD documents inserted: ' + res.insertedCount);
              db.collection('campaignsInfo').insertMany(results[1], function(err, res) {
               if (err) callback(err);
               console.log('Number of Campaign UAT documents inserted: ' + res.insertedCount);
               callback(null);
               });
            });
         });
      };

   }).catch(function(err) {
      callback(err);
   });
}


function getSingleCampaignInfoFromMetadata (campaignName, callback) {
   var conn = require('../routes/db');
   var cn = conn.getMetadataCn();
   var ibmdb = require('ibm_db');

   uatPrefix = ''
   if (campaignName.startsWith("[UAT]")) {
      campaignName = campaignName.substring(5)
      uatPrefix = ' \'[UAT]\' || '
      cn = conn.getUATMetadataCn();
     }   
         
   ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
     if (err) {
        callback(err);
     } else {
        var query = "select a.ARTIFACT_ID as CAMPAIGN_ID, client_name as CLIENT_NAME, a.ACCOUNT_NUMBER as ACCOUNT, " + uatPrefix + " ARTIFACT_NAME  as CAMPAIGN_NAME, CAMPAIGN_CD, u.USER_NAME\
                    from ATLAS.artifact a, ATLAS.client c, atlas.campaign k, atlas.user u\
                    where a.CLIENT_ID = c.CLIENT_ID and a.ARTIFACT_ID = k.ARtifact_ID and a.UPD_USER_ID = u.USER_ID  \
                    and a.ARTIFACT_NAME = '" + campaignName + "' \
                    WITH UR FOR READ ONLY;"
 
        connection.query(query, function (err, row) {
         if (err) {
             callback(err);
         } else if (row.length == 0) {
            callback(null, null);
         } else  {
             connection.close();
             var db = conn.getMongoDb();
             if (db == null) {
                callback('Unable to connecto to Mongo DB');
             } else {
                  db.collection('campaignsInfo').insert(row, function(err, res) {
                  if (err) callback(err);
                  callback(null, row);
                  });
             };
         }
       });
     }
   });	  
 }

 function getCampaignsFromMetadata (type, callback) {
   var conn = require('../routes/db');
   var cn = conn.getMetadataCn();
   var cn_uat = conn.getUATMetadataCn();
   
   var campaignFilter = ""
   var processFields = " PROCESS.TYPE as PROCESS_TYPE, PROCESS.NAME AS PROCESS_NAME, PROCESS.STATUS AS PROCESS_STATUS, PROCESS.START AS PROCESS_START, PROCESS.END AS PROCESS_END "
   var processXMLTable = ", XMLTABLE ('for $e in $d\/*\/processes return $e' passing xmlparse(document C.TASK_PROCESS_STATUS) as \"d\"\
                           COLUMNS  \
                           \"NAME\" VARCHAR(100) PATH '@name', \
                           \"TYPE\"   VARCHAR(100) PATH '@processType', \
                           \"STATUS\" VARCHAR(30) PATH '@status', \
                           \"START\" VARCHAR(30) PATH '@start', \
                           \"END\" VARCHAR(30) PATH '@end' \
                           ) as PROCESS "

   if (type == 'executing') {
      campaignFilter = " AND B.JOB_STATUS_CD in (2, 9) AND PROCESS.STATUS IN ('Executing', 'Executing Async', 'Waiting for Slot' ) "
   } else if (type == 'failed') {
      campaignFilter = " AND B.JOB_STATUS_CD =  5 AND B.ENVIRONMENT_ID IN (" + appEnvironmentsList +") AND PROCESS.STATUS IN ('Failed') "
   } else if (type == 'queued') {
      campaignFilter = " AND B.JOB_STATUS_CD IN (6,7,8,9,10) AND B.ENVIRONMENT_ID IN (" + appEnvironmentsList + ") "
      processFields = " '' AS PROCESS_TYPE, '' AS PROCESS_NAME, '' AS PROCESS_STATUS, '' AS PROCESS_START, '' AS PROCESS_END "
      processXMLTable = " "
   } else {
      callback(' Invalid getCampaignsFromMetadata type:' + type);
   }

   var baseQuery = " SELECT  DISTINCT " + appEnvironmentsCase +  "\
   RUN_INSTANCE_ID, date(LOAD_VIEW_END_TS) AS DB2_TRADE_BASE_DT, B.DAILY_DATA_DT AS ASCEND_TRADE_BASE_DT, CLIENT_NAME, F.ACCOUNT_NUMBER as ACCOUNT, var_campaignName as CAMPAIGN_NAME, \
   " + processFields + " \
   FROM ATLAS.CAMPAIGN A, ATLAS.JOB_QUEUE B, ATLAS.JOB_QUEUE_DETAIL C, ATLAS.CLIENT D, ATLAS.ACCOUNT_NUMBER E, ATLAS.ARTIFACT F " + processXMLTable + " \
   WHERE A.ARTIFACT_ID=B.CAMPAIGN_ID AND B.JOB_QUEUE_ID=C.JOB_QUEUE_ID AND D.CLIENT_ID=E.CLIENT_ID AND \
   A.ACCOUNT_NUMBER=E.ACCOUNT_NUMBER AND A.ARTIFACT_ID=F.ARTIFACT_ID " + campaignFilter + " \
   ORDER BY ENVIRONMENT, RUN_INSTANCE_ID, PROCESS_START FOR READ ONLY WITH UR; "

   var query = baseQuery.replace('var_campaignName', ' ARTIFACT_NAME ')
   var query_uat = baseQuery.replace('var_campaignName', ' \'[UAT]\' || ARTIFACT_NAME')
 
   Promise.all([helpers.executeQueryPromise(cn, query), helpers.executeQueryPromise(cn_uat, query_uat)])
   .then(results => {
      //concatenate the prod and uat results
      callback(null, results[0].concat(results[1]));
   }).catch(function(err) {
      console.log('query:')
      console.log(query)
      console.log('query_uat:')
      console.log(query_uat)
      callback(err);
   });
 }

function updateTableOperationDetailsByCampaign (campaignName, callback) {
  getCampaignTablesList(campaignName, function (err, tables) {
      if (err) callback(err);
      var table = require('../models/table-model')
      table.getTablesOperationByTablesList(tables, campaignName, function (err, operations) {
         if (err) { 
            callback(err) 
        } else {
            var conn = require('../routes/db');
            var db = conn.getMongoDb();
            if (db == null) {
               callback('Unable to connecto to Mongo DB');
            } else {
               if (operations.length === 0) { 
                  callback(' No operations found for on Metadata database for ' + campaignName);
               }
               db.collection('orjobsSpace').updateMany({'CAMPAIGN_NAME':campaignName},   { $unset: { OPERATIONS: "" }}, function(err, us_result) {
                  if (err) callback(err);
                  operations.forEach(function (OPERATIONS, i) {
                     thisTableName = OPERATIONS.TABLE_NAME.replace('ORJOBS01.', '');
                     db.collection('orjobsSpace').updateMany({'TABLE_NAME':thisTableName},{$push: {OPERATIONS}}, function(err, u2_result) {
                        if (err) callback(err);
                        if(i === operations.length - 1) {
                           console.log(operations.length + ' Operations added to tables of campaign  ' + campaignName);
                           callback(null);
                        }
                     });
                  });
               });
            };
         }
      });
  });
}

function getCampaignTablesList (campaignName, callback) {
  var conn = require('../routes/db');
  var db = conn.getMongoDb();
  if (db == null) {
      callback('Unable to connecto to Mongo DB');
   } else {
     db.collection('orjobsSpace').find({'CAMPAIGN_NAME':campaignName},{ TABLE_NAME: 1}).toArray(function(err, tablesList) {
       if (err) callback(err);
       callback(null, tablesList);
     });
   };
}

function getClientsByCampaignsFromCampaignsList (callback) {
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB');
    } else {
      db.collection('campaignsInfo').distinct("CLIENT_NAME", function(err, clientsList) {
        if (err) callback(err);
        callback(null, clientsList);
      });
    };
 }

 function getAccountsByClientsFromCampaignList (clientName, callback) {
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB');
    } else {
      db.collection('campaignsInfo').distinct("ACCOUNT", {"CLIENT_NAME" : clientName}, function(err, accountsList) {
        if (err) callback(err);
        callback(null, accountsList);
      });
    };
 }

function getCampaignsByAccountFromCampaignList (accountNumber, callback) {
   var conn = require('../routes/db');
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB');
    } else {
      db.collection('campaignsInfo').distinct("CAMPAIGN_NAME", {"ACCOUNT" : accountNumber}, function(err, campaignsList) {
        if (err) callback(err);
        callback(null, campaignsList);
      });
    };
 }

exports.getCampaignDetails = getCampaignDetails;
exports.getCampaignsInfoFromMetadata = getCampaignsInfoFromMetadata;
exports.getCampaignsFromMetadata = getCampaignsFromMetadata;
exports.getClientsByCampaignsFromCampaignsList = getClientsByCampaignsFromCampaignsList;
exports.getAccountsByClientsFromCampaignList = getAccountsByClientsFromCampaignList;
exports.getCampaignsByAccountFromCampaignList = getCampaignsByAccountFromCampaignList;
exports.updateAllCampaignsExecutionInfo = updateAllCampaignsExecutionInfo;
exports.updateSingleCampaignExecutionDetails = updateSingleCampaignExecutionDetails;
exports.getRunInstanceDetails = getRunInstanceDetails;
exports.updateTableOperationDetailsByCampaign = updateTableOperationDetailsByCampaign;
exports.updateCampaignsFromMetadataByAccountNumber = updateCampaignsFromMetadataByAccountNumber
