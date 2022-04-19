var helpers = require('./helpers')
var server = require('../models/server-model')

const linuxDBCoordinatorServer = server.getLinuxCoordinator()
const AIXETLCoordinatorServer  = server.getETLCoordinator()

const formatLinuxDataTransferEvents = (dataTransferLine) => { 
   return new Promise((resolve, reject) => {
      events = []
      myRegExp = new RegExp(/^.*'mode' => '(?<mode>\S+)'.*'switchviews' => '(?<switchviews>.*)'.*'displaydatetime' => '(?<displaydatetime>\S+ \S+)'.*'elapsedtime' => '(?<elapsedtime>\S+)'.*'flavor' => '(?<flavor>.*)'.*\)\;/); 

      dataTransferLine.forEach(function (thisLine) {
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

function getDatatransfersStatus (callback) {
   Promise.all([helpers.executeSSHCommandPromise(linuxDBCoordinatorServer, 'ps -fea | grep -i DataTransferNew.pl '),
                helpers.executeSSHCommandPromise(AIXETLCoordinatorServer, ' ps -fea|grep dsopera|grep -E "executeAll|requester|transfer" ')])
   .then(results => {
      console.log(results)
      formatLinuxDataTransferEvents(results[1])
      .then(response => { 
         callback(null, results[0], results[1]);
      })
      .catch(error => {
         console.error(error)
      })
   }).catch(function(err) {
      callback(err);
    });
}

exports.getDatatransfersStatus = getDatatransfersStatus;
