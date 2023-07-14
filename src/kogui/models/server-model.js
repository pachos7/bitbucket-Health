var helpers = require('../models/helpers')
var conn = require('../routes/db');

const blockCorrectionConstant = 5242792;

const  linuxDBServersArray = [
    '10.8.30.131', /*usmkpdbgvp01*/
    '10.8.30.132', /*usmkpdbgvp02*/
    '10.8.30.133', /*usmkpdbgvp03*/
    '10.8.30.134', /*usmkpdbgvp04*/
    '10.8.30.135', /*usmkpdbgvp05*/
    '10.8.30.136', /*usmkpdbgvp06*/
    '10.8.30.137', /*usmkpdbgvp07*/
    '10.8.30.138', /*usmkpdbgvp08*/
    '10.8.30.139', /*usmkpdbgvp09*/
    '10.8.30.140', /*usmkpdbgvp10*/
    '10.8.30.141', /*usmkpdbgvp11*/
    '10.8.30.142', /*usmkpdbgvp12*/
    '10.8.30.143', /*usmkpdbgvp13*/
    '10.8.30.144', /*usmkpdbgvp14*/
    '10.8.30.145', /*usmkpdbgvp15*/
    '10.8.30.146', /*usmkpdbgvp16*/
    '10.8.30.147', /*usmkpdbgvp17*/
    '10.8.30.148', /*usmkpdbgvp18*/
    '10.8.30.149', /*usmkpdbgvp19*/
    '10.8.30.150', /*usmkpdbgvp20*/
    '10.8.30.151'  /*usmkpdbgvp21*/
    ];

const  AIXDBServersArray = [
    '192.168.215.1',  /*df2n01-e1*/
    '192.168.215.2',  /*df3n01-e1*/
    '192.168.215.3',  /*df4n01-e1*/
    '192.168.215.4',  /*df5n01-e1*/
    '192.168.215.5',  /*df6n01-e1*/
    '192.168.215.6',  /*df7n01-e1*/
    '192.168.215.7',  /*df8n01-e1*/
    '192.168.215.8',  /*df9n01-e1*/
    '192.168.215.9',  /*df10n01-e1*/
    '192.168.215.10', /*df11n01-e1*/
    '192.168.215.26', /*df12n01-e1*/
    '192.168.215.12', /*df13n01-e1*/
    '192.168.215.13', /*df14n01-e1*/
    '192.168.215.14', /*df15n01-e1*/
    ];

const  AIXAuxDBServersArray = [
    '192.168.215.24', /*df25n01-e1*/
    ];

const  AIXPinningDBServersArray = [
    '192.168.215.15', /*df16n01-e1*/
];
  
const  AIXBackendServersArray = [
    '192.168.215.23', /*df24n01-e1*/
    ];

const  AIXETLServersArray = [
    '192.168.215.126',  /*df27n01-e1*/
    '192.168.215.19',   /*df20n01-e1*/
    '192.168.215.20',   /*df21n01-e1*/
    '192.168.215.21',   /*df22n01-e1*/
    ];
    
const NASVolumes = [
    {volumeID:'NLFS001'},
    {volumeID:'NLFS002'},
    {volumeID:'NLFS003'},
    {volumeID:'NLFS004'},
    {volumeID:'NLFS005'},
    {volumeID:'NLFS006'},
    {volumeID:'NLFS007'},
    {volumeID:'NLFS008'},
    {volumeID:'NLFS009'},
    {volumeID:'NLFS010'},
    {volumeID:'NLFS011'},
    {volumeID:'NLFS012'},
    {volumeID:'NLFS013'},
    {volumeID:'NLFS014'},
    {volumeID:'NLFS015'},
    {volumeID:'NLFS016'},
    {volumeID:'NLFS017'},
    {volumeID:'NLFS018'},
    {volumeID:'NLFS019'},
    {volumeID:'NLFS020'},
    {volumeID:'NLFS021'},
    {volumeID:'NLFS022'},
    {volumeID:'NLFS023'},
    {volumeID:'NLFS024'},
    {volumeID:'NLFS025'},
    {volumeID:'NLFS026'},
    {volumeID:'NLFS027'},
    {volumeID:'NLFS028'},
    {volumeID:'NLFS029'},
    {volumeID:'NLFS030'},
    {volumeID:'NLFS031'},
    {volumeID:'NLFS032'},
    {volumeID:'NLFS033'},
    {volumeID:'NLFS034'},
    {volumeID:'NLFS035'},
    {volumeID:'NLFS036'},
    {volumeID:'NLFS037'},
    {volumeID:'NLFS038'},
    {volumeID:'NLFS039'},
    {volumeID:'NLFS040'},
    {volumeID:'NLFS041'},
    {volumeID:'NLFS042'},
    {volumeID:'NLFS043'},
    {volumeID:'NLFS044'},
    {volumeID:'NLFS045'},
    {volumeID:'NLFS046'},
    {volumeID:'NLFS047'},
    {volumeID:'NLFS048'},
    {volumeID:'NLFS049'},
    {volumeID:'NLFS050'},
    {volumeID:'NLFS051'},
    {volumeID:'NLFS052'},
    {volumeID:'NLFS053'},
    {volumeID:'NLFS054'},
    {volumeID:'NLFS055'},
    {volumeID:'NLFS056'}
];


function getLinuxCoordinator() {
   var coordinator = linuxDBServersArray[20]
   return coordinator;
}

function getETLCoordinator() {
   var coordinator = AIXETLServersArray[3]
   return coordinator;
}



function convertKb2TB(inKbValue) {
    var TB = parseFloat(inKbValue/1024/1024/1024).toFixed(2)
    if (isNaN(TB))
      return (0);
    else
      return (TB);
}

function getDBFileSystemInfoDetails (environment, callback) {
  helpers.validateEnvironment(environment, function(err){
     if (err) {callback(err)}
     else {
        var totalSpace = 0;
        var spaceUsed = 0;
        var spaceAvailable = 0;
        var serversProcessed = 0;
        var serverList = null;
        var system = null;
        var maxNodeUsage = 0;
        var maxNodeName = null;

        var fileSystem = ''
        if (environment == 'Aggregation') {
           fileSystem = '/db2/fs1/db2porag';
           serverList = linuxDBServersArray;
           system = 'Linux';
        } else if (environment == 'Archives') {
           fileSystem = '/db2/fs1/db2parch';
           serverList = linuxDBServersArray;
           system = 'Linux';
         } else if (environment == 'Archives2') {
            fileSystem = '/db2/fs2/db2parch';
            serverList = linuxDBServersArray;
            system = 'Linux';
        } else if (environment == '100pct') {
           fileSystem = '/db2/node';
           serverList = AIXDBServersArray;
           system = 'AIX';
        } else if (environment == '1pct') {
           fileSystem = '/db2/node';
           serverList = AIXAuxDBServersArray;
           system = 'AIX';
        } else if (environment == 'Pinning') {
           fileSystem = '/db2/node'
           serverList = AIXPinningDBServersArray;
           system = 'AIX';
        }
        serverFileSystemRetrieveFailed = false
        serverList.forEach(function (thisServer, idx) {
           getFileSystemSpaceinfoFromServer(thisServer, fileSystem, system, function(err, serverInfo){
              if (err) {
                  if (idx === serverList.length - 1) {
                     callback(err);
                  }
              } else {
                 serversProcessed = serversProcessed + 1;
                 if (serverInfo !== undefined) {
                     serverInfo.forEach(function (thisNode) {
                        var thisNodeSpace = 0;
                        var thisNodeSpaceUsed = 0;
                        var fields = thisNode.split(/\s+/);
                        if (fields.length > 1) {
                           thisNodeSpace = Number(convertKb2TB(fields[1]));
                           thisNodeSpaceUsed = Number(convertKb2TB(Number(fields[2]) + Number(blockCorrectionConstant)));
                           thisNodeSpaceAvailable = Number(convertKb2TB(fields[3]));

                           totalSpace = Number(totalSpace) + Number(thisNodeSpace);
                           spaceUsed = Number(spaceUsed) + Number(thisNodeSpaceUsed);
                           spaceAvailable = Number(spaceAvailable) + Number(thisNodeSpaceAvailable);
                           
                           var thisNodeUsage = parseFloat((1 - (thisNodeSpaceAvailable/thisNodeSpace)) * 100).toFixed(2);
                           if (parseFloat(thisNodeUsage) > parseFloat(maxNodeUsage)) {
                              maxNodeUsage = thisNodeUsage;
                              maxNodeName = fields[5].toUpperCase().match(/NODE[(0-9)]*/)[0];
                           }
                        }
                     });
                    
                     // Once all servers have been scanned save the information to the Pulse collection
                     if (serversProcessed === serverList.length) {
                        if (serverFileSystemRetrieveFailed) {
                           console.log('Environment:' + environment + '- Unable to retrieve file system detail from some servers');
                           callback('Environment:' + environment + '- Unable to retrieve file system detail from some servers');
                        }
                        else {
                           totalSpace = parseFloat(Number(totalSpace).toFixed(2));
                           spaceUsed  = parseFloat(Number(spaceUsed).toFixed(2));
                           maxNodeUsage = parseFloat(Number(maxNodeUsage).toFixed(2));
                           var avgPctUsed =  parseFloat((Number(spaceUsed/totalSpace) * 100).toFixed(2));

                           var pulse = require('../models/pulse-model');
                           var pulseInfo = [['DB_TOTAL_SPACE', totalSpace], ['DB_SPACE_USED',spaceUsed], ['DB_AVG_SPACE_USE', avgPctUsed], ['DB_MAX_NODE_USAGE',maxNodeUsage], ['DB_MAX_PCT_NODE_NAME', maxNodeName]];
                           pulse.updateMultipleFieldInPulse(helpers.getCurrentDate(), environment, pulseInfo, function(err) {
                              if (err) callback(err)
                              else {
                                 console.log('Environment:' + environment + '/ Total Space:' +totalSpace + '/ Total Space Used:' + spaceUsed + '/ Average % used:' + avgPctUsed + '/ Max Node Usage %: ' + maxNodeUsage + ' at node: ' + maxNodeName);
                                 callback();
                              }
                           });
                        }
                     }
               } else {
                  console.log('Unable to retrieve File System info for: ' + environment + ' - ' + thisServer); 
                  serverFileSystemRetrieveFailed = true
               }   
             }
          });
        });
     }
  });
}

function getFileSystemSpaceinfoFromServer(serverIP, fileSystem, dBsystem, callback) {
    var user = null;
    var pass = null;
    var execCommand = null;

    if (dBsystem == 'Linux') {
       user = conn.getLinuxDbUserName();
       pass = conn.getLinuxDbPassword();
       execCommand = 'df -k | grep \'' + fileSystem + '\' | grep -v NODE0000';
    } else if (dBsystem == 'AIX') {
       user = conn.getAIXDbUserName();
       pass = conn.getAIXDbPassword();
       execCommand = 'df -k -I | grep \'' + fileSystem + '\' | grep -v node0000 | grep -v node0111';
    }
    
    helpers.executeSSHCommand(serverIP, execCommand, user, pass, function(err, stringData){
        if (err) callback(err);
        callback(null, stringData);
    });    
}

function getFileSystemStatus(callback) {
    var db = conn.getMongoDb();
    if (db == null) {
        callback('Unable to connecto to Mongo DB')
    } else {
       db.collection('pulse').update({ "DATE": helpers.getCurrentDate()}, {$unset: {"fileSystemInfo":1}}, false, true);

       var user = conn.getAIXDbUserName();
       var pass = conn.getAIXDbPassword();
       var serversList = AIXETLServersArray.concat(AIXBackendServersArray);
       serversList.forEach(function (thisServer, idx) {
          helpers.executeSSHCommand(thisServer, 'df -k -I | grep /', user, pass, function(err, serverInfo){
              if (err) {
                 callback(err);
              } else {
                  serverInfo.forEach(function (thisfileSystem) {
                     var fields = thisfileSystem.split(/\s+/);
                     if (fields.length > 1) {
                        thisfileSystemSpace = Number(fields[1]);
                        thisfileSystemSpaceUsed = Number(fields[2]);
                        var thisfileSystemUsage = Number(parseFloat((thisfileSystemSpaceUsed/thisfileSystemSpace) * 100).toFixed(2));
                        db.collection('pulse').update({ "DATE": helpers.getCurrentDate()}, 
                                       { $addToSet: {"fileSystemInfo": {"Server":thisServer, "path":fields[5],"size":thisfileSystemSpace,"used":thisfileSystemSpaceUsed,"usage":thisfileSystemUsage}}}), 
                                       function(err, res) {
                           if (err) callback(err);
                        }
                     }
                  });
                  if (idx === serversList.length - 1) {
                     console.log('getFileSystemStatus Done!');
                     callback();
                  }
              }
          });
       });
    }
}

function getAllDBFileSystemsInfo (callback) {
  var environments = helpers.environments;
  environments.forEach(function(thisEnvironment, idx) {
    getDBFileSystemInfoDetails(thisEnvironment, function (err, result) {
      if (err) { 
        if (idx === environments.length - 1) {
           callback(err);
        }
      } else {  
         if (idx === environments.length - 1) {
          callback(null);
         }
      }
    });
  });
}

function getNASVolumeInfo(serverIP, callback) {
    var user = null;
    var pass = null;
    var execCommand = null;

    user = conn.getLinuxDbUserName();
    pass = conn.getLinuxDbPassword();
    execCommand = 'df -k | grep "/appNFS/NLFS[(0-9)]*$"';
    helpers.executeSSHCommand(serverIP, execCommand, user, pass, function(err, stringData){
        if (err) callback(err);
        callback(null, stringData);
    });     
}

function findNASByVolumeID(VolumeID, thisNASUpdate) {
    for (var i = 0; i < thisNASUpdate.length; i++) {
        if (thisNASUpdate[i].volumeID == VolumeID) {
            return thisNASUpdate[i];
        }
    }
    return null;
}

function allNASVolumesUpdated(thisNASUpdate) {
  for (var i = 0; i < thisNASUpdate.length; i++) {
      if (typeof(thisNASUpdate[i].updated) === 'undefined' || (thisNASUpdate[i].updated === false)) {
          return false;

      } else if (i === thisNASUpdate.length - 1) {
          return true;
      }
  }
}

function saveNASData (NASInfo, callback) {
   var db = conn.getMongoDb();
   if (db == null) {
      callback('Unable to connecto to Mongo DB');
   } else {
      db.collection('NASInfo').deleteMany({}, function(err) {
        if (err) callback(err);
        db.collection('NASInfo').insertMany(NASInfo, function(err) {
          if (err) callback(err);
          callback(null);
        });
      });
   };
}

function updateNASInfo (callback) {
  var serverList = linuxDBServersArray;
  var thisNASUpdate = [];
  thisNASUpdate = JSON.parse(JSON.stringify(NASVolumes)); // copy values only without keeping a reference to NASVolumes

  serverList.forEach(function (thisServer, idx) {
     getNASVolumeInfo(thisServer, function(err, serverNASInfo){
        if (err) callback(err)
        else {
           if (serverNASInfo !== 'undefined') { 
               serverNASInfo.forEach(function (thisVolume, sidx) {
                  var fields = thisVolume.split(/\s+/);
                  var thisVolumeName = findNASByVolumeID(fields[0].match(/NLFS[(0-9)]*/), thisNASUpdate);
                  if(thisVolumeName !== null) {
                     thisVolumeName.size = Number(convertKb2TB(fields[1]));
                     thisVolumeName.avail = Number(convertKb2TB(fields[3]));
                     thisVolumeName.updated = true;
                  }
               });
           }
        }
        if (allNASVolumesUpdated(thisNASUpdate) === true) {
           saveNASData(thisNASUpdate, function (err) {
              if (err) callback(err);
              callback(null);
           });
        }
    });
  });
}

function getNASInfo(callback) {
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
   } else {
      db.collection('NASInfo').find({}, {volumeID: 1, size:1, avail:1}).toArray(function (err, NASInfo) {
          if (err) callback(err);
          callback(null, NASInfo);
      });
   };
}

function getHouseKeepingInfo(callback) {
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
    } else {
      db.collection('pulse').find({"houseKeepingDaemonInfo":{ $exists: true }},{"DATE":1,"houseKeepingDaemonInfo":1,"houseKeepingOperationsInfo":1}).sort({"DATE": -1}).limit(1).toArray(function (err, houseKeepingInfo) {
          if (err) {
             callback(err);
          } else {
            callback(null, houseKeepingInfo[0]);
          }
      });
    }
}

function getFileSystemInfo(callback) {
   var db = conn.getMongoDb();
   if (db == null) {
       callback('Unable to connecto to Mongo DB')
    } else {
      db.collection('pulse').find({"fileSystemInfo":{ $exists: true }},{"DATE":1,"fileSystemInfo":1}).sort({"DATE": -1}).limit(1).toArray(function (err, fileSystemInfo) {
          if (err) callback(err);
          callback(null, fileSystemInfo[0]);
      });
    }
}

function getHouseKeepingOperationsStatus (callback) {
   var cn = conn.getMetadataCn();
   var ibmdb = require('ibm_db');

   ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
     if (err) {
         callback('error connecting to Metadata Db:' + err);
      } else {    
         
         var query = "SELECT e.DATABASE_NAME as DATABASE, date(h.REQUEST_TS) as DATE, count(*) as COUNT,\
                     CASE h.OPERATION_TYPE_CD WHEN 0 THEN 'BACKUP' WHEN 1 THEN 'DELETE' WHEN 2 THEN 'RESTORE' WHEN 3 THEN 'PURGE' WHEN 4 THEN 'DELETE_EXPORT' WHEN 5 THEN 'RESTORE_V1' ELSE '???' END as OPERATION \
                     FROM ATLAS.TABLE_RETENTION t\
                     INNER JOIN ATLAS.TABLE_OPERATION_HISTORY h ON(t.TABLE_ID=h.TABLE_ID)\
                     INNER JOIN ATLAS.JOB_QUEUE jq ON(t.JOB_QUEUE_ID = jq.JOB_QUEUE_ID)\
                     INNER JOIN ATLAS.RETENTION_REQUEST r ON(jq.JOB_QUEUE_ID = r.JOB_QUEUE_ID)\
                     INNER JOIN ATLAS.ENVIRONMENT e ON(jq.ENVIRONMENT_ID = e.ENVIRONMENT_ID)\
                     WHERE h.STATUS_CD IN(0)\
                     AND h.REQUEST_TS <= CURRENT TIMESTAMP + 10 DAYS\
                     GROUP BY e.DATABASE_NAME,h.OPERATION_TYPE_CD,date(h.REQUEST_TS)\
                     ORDER BY e.DATABASE_NAME, h.OPERATION_TYPE_CD,date(h.REQUEST_TS)\
                     WITH UR FOR READ ONLY;"

         connection.query(query, function (err, rows) {
            if (err) {
               connection.close();
               callback (' getHouseKeepingOperationsStatus error:' + err);
            } else {
               connection.close();

               var db = conn.getMongoDb();
               if (db == null) {
                  callback('Unable to connecto to Mongo DB');
               } else {
                  db.collection('pulse').update({ "DATE": helpers.getCurrentDate(), "ENVIRONMENT" : "1pct"}, {$unset: {"houseKeepingOperationsInfo":1}}, false, true);
                  db.collection('pulse').update({ "DATE": helpers.getCurrentDate(), "ENVIRONMENT" : "1pct"}, 
                                                { $set: {"houseKeepingOperationsInfo":  rows}}, 
                                                { upsert: true }, function(err, res) { 
                        if (err) {
                           callback(err);
                        } else {
                           console.log(' HK Opearations status updated!');
                           callback();
                        }
                  });
               };
           }
         });
       }
    });	
 } 
 

function getHouseKeepingDaemonsStatus (callback) {
   var serverList = AIXBackendServersArray;
   var user = null;
   var pass = null;

   user = conn.getAIXDbUserName();
   pass = conn.getAIXDbPassword();
  
   serverList.forEach(function (thisServer) {
      //Read the HK configuration file
      var catCommand = 'cat \/apps\/hk_nearline\/profileOrionAPPHousekeeping_APPNFS.cfg ';

      helpers.executeSSHCommand(thisServer,  catCommand, user, pass, function(err, hkConfigData){
         if (err) { 
            callback(err);
         }
         else {
            var types = null;
            var typesRegexp = /(set -A prod_types)/g;
            var targets = null;
            var targetsRegexp = /(set -A prod_targets)/g;
            
            hkConfigData.forEach(function (thisLine) {
               var typesMatch = typesRegexp.exec(thisLine);
               if (typesMatch != null) {
                     types = thisLine.substring(typesMatch[1].length + 1, typesMatch.input.length).replace(/(^\s+|\s+$)/g,'').split(" ");
               }

               var targetsMatch = targetsRegexp.exec(thisLine);
               if (targetsMatch != null) {
                  targets = thisLine.substring(targetsMatch[1].length + 1, targetsMatch.input.length).replace(/(^\s+|\s+$)/g,'').split(" ");
               }
            });

            console.log('types:' + types)
            console.log('targets:' + targets)
            //Initialize structure to save Daemons status
            var houseKeepingDaemonInfo = [];
            types.forEach(function(thisType) {
               var thisDaemonStatus = {"Type":thisType};
               targets.forEach(function(thisTarget) {
                  thisDaemonStatus[thisTarget] = 0;
               });
               houseKeepingDaemonInfo.push(thisDaemonStatus);
            });

            //get information from the running Daemons
            var command = 'ps -ef | grep -i \'orionAPPNearlineHKDaemon\' | grep -v \'grep\' '
            helpers.executeSSHCommand(thisServer, command, user, pass, function(err, daemonsStatusData){
               if (err) { 
                  callback(err);
               } else {
                  daemonsStatusData.forEach(function (thisProcess) {
                     var typeRegexp = /[A-Z0-9]+_APPNFS.sh/g;
                     var myRegExp =/orionAPPNearlineHKDaemon_([A-Za-z0-9]+)_APPNFS.sh\s([A-Za-z0-9]+)_APPNFS/g;
                     var typeMatch = typeRegexp.exec(thisProcess);
                     var myMatch = myRegExp.exec(thisProcess);
                     if (myMatch != null) {
                        var typeIndex = houseKeepingDaemonInfo.findIndex((obj => obj["Type"] == myMatch[1]));
                        if (typeIndex != null) {
                           houseKeepingDaemonInfo[typeIndex][myMatch[2]] = 1;
                        } else console.log('type error:' + myMatch[1]);
                     }
                  });
         
                  var db = conn.getMongoDb();
                  if (db == null) {
                     callback('Unable to connecto to Mongo DB')
                  } else {
                     db.collection('pulse').update({ "DATE": helpers.getCurrentDate(), "ENVIRONMENT" : "1pct"}, 
                                                   { $set: {"houseKeepingDaemonInfo": houseKeepingDaemonInfo}}, 
                                                   { upsert: true }, function(err, res) {                                 
                           if (err) callback(err);
                           callback();
                     });
                  };
               }
            });
         } 
      });
   });
}

exports.getFileSystemStatus = getFileSystemStatus;
exports.getHouseKeepingInfo = getHouseKeepingInfo;
exports.getAllDBFileSystemsInfo = getAllDBFileSystemsInfo;
exports.updateNASInfo = updateNASInfo;
exports.getNASInfo = getNASInfo;
exports.getHouseKeepingDaemonsStatus = getHouseKeepingDaemonsStatus;
exports.getHouseKeepingOperationsStatus = getHouseKeepingOperationsStatus;
exports.getFileSystemInfo = getFileSystemInfo;
exports.getETLCoordinator = getETLCoordinator;
exports.getLinuxCoordinator = getLinuxCoordinator;