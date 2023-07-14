var helpers = require('./helpers')
var conn = require('../routes/db');
var server = require('../models/server-model') 

const linuxDBCoordinatorServer = server.getLinuxCoordinator()
const AIXETLCoordinatorServer  = server.getETLCoordinator()

const formatDashboardEvents = (dashboardLines) => { 
   return new Promise((resolve, reject) => {
      events = []
      myRegExp = new RegExp(/^.*'mode' => '(?<mode>\S+)'.*'switchviews' => '(?<switchviews>.*)'.*'displaydatetime' => '(?<displaydatetime>\S+ \S+)'.*'elapsedtime' => '(?<elapsedtime>\S+)'.*'flavor' => '(?<flavor>.*)'.*\)\;/); 

      dashboardLines.forEach(function (thisLine) {
         var myMatch = thisLine.match(myRegExp);   
         if (myMatch != null) {
            events.unshift([myMatch[1], myMatch[2], myMatch[3], myMatch[4], myMatch[5]])
         } else {
            console.log(' No Match: >' + thisLine + '<')
         }
      });
      resolve(events)
   })
}

function getPostETLStatusDetails (some_param, callback) {
   Promise.all([helpers.executeSSHCommandPromise(AIXETLCoordinatorServer, 'tail -100 /dsprojects/logs/buildDataWarehouse.log '),
                helpers.executeSSHCommandPromise(AIXETLCoordinatorServer, 'tail -300 /ds/dsadm/DSScripts/SQLScripts/PostETLUI/___________DashBoard ')])
   .then(results => {
      formatDashboardEvents(results[1])
      .then(response => { 
         callback(null, 'buildDataWarehouse.log', results[0], response);
      })
      .catch(error => {
         console.error(error)
      })
   }).catch(function(err) {
      callback(err);
    });
}

function getOnGoingStatusDetails (some_param, callback) {
   var user = null;
   var pass = null;
   var execCommand = null;

   user = conn.getLinuxDbUserName();
   pass = conn.getLinuxDbPassword();
   execCommand = 'ls -tr /db2/home/db2porag/perl/activeDataWarehouse/logs | grep -i appArchiveOngoing.log | tail -n 1 | ( read foo; tail -200 /db2/home/db2porag/perl/activeDataWarehouse/logs/$foo; )';
   
   helpers.executeSSHPromise(linuxDBCoordinatorServer, execCommand, user, pass, function(err, lastOnGoingBuildFileContent){
      console.log('back from executeSSHPromise in getOnGoingStatusDetails')
       if (err) callback(err);
       console.log(lastOnGoingBuildFileContent)
       callback(null, 'appArchiveOngoing.log', lastOnGoingBuildFileContent);
   });    
}

function getOnGoingStatusDetailsWorking (some_param, callback) {
   var user = null;
   var pass = null;
   var execCommand = null;

   user = conn.getLinuxDbUserName();
   pass = conn.getLinuxDbPassword();
   execCommand = 'ls -tr /db2/home/db2porag/perl/activeDataWarehouse/logs | grep -i appArchiveOngoing.log | tail -n 1 | ( read foo; tail -200 /db2/home/db2porag/perl/activeDataWarehouse/logs/$foo; )';
   
   helpers.executeSSHCommand(linuxDBCoordinatorServer, execCommand, user, pass, function(err, lastOnGoingBuildFileContent){
       if (err) callback(err);
       console.log(lastOnGoingBuildFileContent)
       callback(null, 'appArchiveOngoing.log', lastOnGoingBuildFileContent);
   });    
}


exports.getPostETLStatusDetails = getPostETLStatusDetails;
exports.getOnGoingStatusDetails = getOnGoingStatusDetails;
