var conn = require('../routes/db');

const doNotDropTables = [
   'R8_MASTER_*_HASHED',
   'A999991_*_TLKTIN_ASCEND_NOHK',
   'A999991_*_TLKTIN_XREF_NOHK',
   'A000028_VELOCITY_HISTORY_NODD',
   'A000028_VELOCITY_PINS_NODD',
   'A012164_AMEX_ADDRESS_NODD',
   'A012452_CITI_UBP_CTL_VERSION_NODD',
   'A024831_LISTI_NODD',
   'A024831_SIDSUPP_NODD',
   'A024831_SSNHSEN_NODD',
   'A024831_SSNHSEP_NODD',
   'A024831_TMCALC_NODD',
   'A026839_CERS_SELECT_NODD',
   'A034312_LEXIS_BILLING_NOHK',
   'A037786_FULL_MASTER_MIGR',
   'A037786_NETDOWN_MASTER_MIGR',
   'A039402_LF_PTR_PIN_ANALYSIS_NODD',
   'A039402_LF_PTR_STATIC_NODD',
   'A039789_SANTANDER_SUPPCBT_NODD',
   'A039789_SANTANDER_SUPPCCA_NODD',
   'A039789_SANTANDER_SUPPCLAA_NODD',
   'A039789_SANTANDER_SUPPISF_NODD',
   'A040537_CFPB_CCP_NOHK',
   'A040537_CFPB_HIGHPIN_NOHK',
   'A040537_CFPB_MAINT_NOHK',
   'A041312_CCAPSAF_STATIC_NODD',
   'A041747_P0000000_MSTFLG_NODD',
   'A041747_P0000000_MSTSUP_NODD',
   'A042222_VEXOL_ADDRESS_NOHK',
   'A042222_VEXOL_BILLING100_NODD',
   'A042222_VEXOL_BILLING_NOHK',
   'A042222_VEXOL_HISTORY100_NODD',
   'A042222_VEXOL_HISTORY_NOHK',
   'A042222_VEXOL_MONTHLY_NOHK',
   'A042222_VEXOL_QUARTERLY_NOHK',
   'A042222_VEXOL_REPORT_NOHK',
   'A042222_VEXOL_SUPP_NOHK',
   'A042222_VEXOL_WFALL_NOHK',
   'A042638_P0000000_ZIP9_ETL_NODD',
   'A044362_SANTANDER_SUPPCUST_NODD',
   'A044481_CLARITY_MAINT2_NODD',
   'A044713_ALLYCARVANA_BILLING',
   'A044790_CITI_ACQMST_NOHK',
   'A553632_CROSSMEDIA_MAINT_NODD',
   'A699470_P0000000_POST_ETL_NODD',
   'A723440_FPN_MAINT_NODD',
   'A867490_SYF_STATIC_NODD',
   'A882222_MAD_FULLFILE_MIGR_RESULTS',
   'A882222_MAD_NOHITS_PIN_MIGR_RESULTS',
   'A882222_MADFILE_HIGHPIN_TABLE_MIGR_RESULTS',
   'A882222_MADFILE_KEEPTBL_PORTIONA_MIGR_RESULTS',
   'A882222_MADFILE_MAXRECNB_TABLE_MIGR_RESULTS',
   'A882222_MIR_FULLFILE_MIGR_RESULTS',
   'A882222_MIR_NOHITS_PIN_MIGR_RESULTS',
   'A882222_MIRFILE_KEEPTBL_PORTIONA_MIGR_RESULTS',
   'A882222_MIRFILE_SEQCODE_TABLE_MIGR_RESULTS',
   'A993333_CLOUD_FULLFILE_MIGR_RESULTS',
   'A993333_CLOUDFILE_HIGHPIN_TABLE_MIGR_RESULTS',
   'A993333_CLOUDFILE_MAXRECNB_TABLE_MIGR_RESULTS',
   'A999991_ROOMBA_HIGHPIN_MIGR_RESULTS',
   'A999992_EQOLV4_WFALL_MIGR_RESULTS',
   'A999991_CC1EK482SF8_20201009162328_FNL_PREM_ALL',
   'A042222_VEXOL_HISTORY100_NODD',
   'A042222_VEXOL_BILLING100_NODD',
   'A013839_CC1EGOCVMCF_20201002152722_NOPII_TABLE',
   'A012164_SOWBUILD_NODD',
   'A032972_WKLY_TRIG_CURR_RATED_*'
]

function getDoNotDropTablesList (callback) {
  callback(null, doNotDropTables);
}

function getTableDetails (tableName, callback) {
  var db = conn.getMongoDb();
  
  db.collection('orjobsSpace').find({'TABLE_NAME':tableName}).toArray(function(err, result) {
    if (err) callback(err);
    callback(null, tableName, result);
  });
}

function updateDoNotDropTablesTag (callback) {

  doNotDropTables.forEach(function (doNotDropTableName, idx) {
     var tableName = doNotDropTableName;
     if (tableName.indexOf("*") > 0) {
        tableName =  tableName.substring(0, tableName.indexOf("*")) + '.*' +tableName.substring(tableName.indexOf("*") + 1);
     }
     tableName = new RegExp(tableName + '$');
     var db = conn.getMongoDb();
     if (db == null) {
         callback('Unable to connecto to Mongo DB');
     } else {
        db.collection('orjobsSpace').updateMany({'TABLE_NAME': { $regex: tableName } }, {$set: {'DoNotDropTag': 'Yes'}}, function(err, result) {
           if (err) callback(err);
           if (result.matchedCount === 0) console.log('No matches found for do-not-drop table :' + tableName);
        });
     };
     
     if(idx === doNotDropTables.length - 1) {
        callback();
     }
  });
}

function getTablesOperationByTablesList (tables, campaignName, callback) {
  var cn = conn.getMetadataCn();
  var ibmdb = require('ibm_db');
  var tablesFilter = ''

  if (campaignName.startsWith("[UAT]")) {
      cn = conn.getUATMetadataCn();
  }  

  tables.forEach(function (thisRow) {
      tablesFilter += '\'ORJOBS01.' + thisRow.TABLE_NAME + '\','
  });
  
  tablesFilter += '\'ORJOBS01.DUMMY_TABLE\'' // Add dummy last table to avoid issues with last ','
  
  ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
    if (err) {
        callback('error connecting to Metadata DB:' + err);
     } else {    
        
        var query = "Select TR.TABLE_NAME as TABLE_NAME, TOH.REQUEST_TS,\
                    CASE TOH.OPERATION_TYPE_CD WHEN 0 THEN 'BACKUP' WHEN 1 THEN 'DELETE' WHEN 2 THEN 'RESTORE' WHEN 3 THEN 'PURGE' WHEN 4 THEN 'DELETE_EXPORT' WHEN 5 THEN 'RESTORE_V1' ELSE '???' END as OPERATION, \
                    CASE TOH.STATUS_CD WHEN 0 THEN 'WAITING HK' WHEN 1 THEN 'IN PROGRESS' WHEN 2 THEN 'COMPLETED' WHEN 3 THEN 'FAILED' WHEN 4 THEN 'CANCEL' WHEN 5 THEN 'PROCESSING' ELSE '???' END as STATUS\
                    from ATLAS.TABLE_OPERATION_HISTORY TOH, ATLAS.TABLE_RETENTION TR\
                    where TOH.TABLE_ID = TR.TABLE_ID\
                    AND TR.TABLE_NAME in ( " + tablesFilter +" ) \
                    ORDER BY TOH.REQUEST_TS ASC\
                    WITH UR FOR READ ONLY;"
                    
        connection.query(query, function (err1, rows) {
           if (err1) {
              callback (' getTablesOperationByTablesList error:' + err1)
           } else {
              connection.close();
              callback(null, rows);
          }
        });
      }
	});	
}

function updateSingleTableOperationDetails (tableName, callback) {
  var cn = conn.getMetadataCn();
  var ibmdb = require('ibm_db');
  console.log('Ready to querying the Metadata for operations on table ' + tableName + ' ');
  ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
    if (err) {
        console.log(err);
        callback('error connecting to Metadata Db:' + err);
     } else {    
        
        var query = "Select TOH.REQUEST_TS,\
                    CASE TOH.OPERATION_TYPE_CD WHEN 0 THEN 'BACKUP' WHEN 1 THEN 'DELETE' WHEN 2 THEN 'RESTORE' WHEN 3 THEN 'PURGE' WHEN 4 THEN 'DELETE_EXPORT' WHEN 5 THEN 'RESTORE_V1' ELSE '???' END as OPERATION, \
                    CASE TOH.STATUS_CD WHEN 0 THEN 'WAITING HK' WHEN 1 THEN 'IN PROGRESS' WHEN 2 THEN 'COMPLETED' WHEN 3 THEN 'FAILED' WHEN 4 THEN 'CANCEL' WHEN 5 THEN 'PROCESSING' ELSE '???' END as STATUS\
                    from ATLAS.TABLE_OPERATION_HISTORY TOH, ATLAS.TABLE_RETENTION TR\
                    where TOH.TABLE_ID = TR.TABLE_ID\
                    AND TR.TABLE_NAME like 'ORJOBS01." + tableName + "%' \
                    ORDER BY TOH.REQUEST_TS ASC\
                    FETCH FIRST 20 ROWS ONLY \
                    WITH UR FOR READ ONLY;"
        console.log('querying the Metadata for ' + tableName + ' operations');
        connection.query(query, function (err, rows) {
           if (err) {
              console.log(' updateSingleTableOperationDetails error:' + err);
              callback (' updateSingleTableOperationDetails error:' + err)
           } else {
              console.log(' Got data from metadata for :' + tableName);
              connection.close();
              var db = conn.getMongoDb();
              if (db == null) {
                  callback('Unable to connecto to Mongo DB')
              } else {
                 db.collection('orjobsSpace').updateMany({'TABLE_NAME':tableName},   { $unset: { OPERATIONS: "" }}, function(us_err, us_result) {
                     var rowsProcessed = 0;
                     if (rows.length > 0) {
                        rows.forEach(function (OPERATIONS) {
                           db.collection('orjobsSpace').updateMany({'TABLE_NAME':tableName},{$push: {OPERATIONS}}, function(u2_err, u2_result) {
                              if (u2_err) throw u2_err;
                              rowsProcessed++;
                              if(rowsProcessed === rows.length) {
                                 console.log(rows.length + ' Operations added to table ' + tableName);
                                 callback(null, rows.length);
                              }
                           });
                        });
                     } else {
                       console.log('No Operations found on DB for table ' + tableName);
                       callback(null, 0);
                     }
                 });
              };
          }
        });
      }
	});	
} 

exports.getTableDetails = getTableDetails;
exports.updateDoNotDropTablesTag = updateDoNotDropTablesTag;
exports.getDoNotDropTablesList = getDoNotDropTablesList;
exports.updateSingleTableOperationDetails = updateSingleTableOperationDetails;
exports.getTablesOperationByTablesList = getTablesOperationByTablesList;
