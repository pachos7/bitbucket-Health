var conn = require('../routes/db');

const environments = ['Aggregation', 'Archives', 'Archives2', '100pct', '1pct', 'Pinning'];

function compareTS(key, order="asc") {
  return function(a, b) {
    if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        return 0; 
    }

    const timeStampA = new Date(a[key]);
    const timeStampB = new Date(b[key]);

    let comparison = 0;
    if (timeStampA > timeStampB) {
      comparison = 1;
    } else if (timeStampA < timeStampB) {
      comparison = -1;
    }
    return (
      (order == "desc") ? (comparison * -1) : comparison
    );
  };
}

function validateEnvironment (environment, callback) {
   if (environments.indexOf(environment) >= 0) { 
      callback(null); 
   } else {  
     callback('Invalid environment: ' + environment);
   }
}

function getCurrentDate (callback) {
   var dateFormat = require('dateformat');
   var now = new Date();
   
   var dateString = dateFormat(now, "yyyy-mm-dd");
   return dateString;
}


function getCurrentDateTimeStamp (callback) {
   var dateFormat = require('dateformat');
   var now = new Date();
   
   var dateString = dateFormat(now, "yyyy-mm-dd HH:MM:ss.l000");
   return dateString;
}

function executeSSHPromise(serverIP, command, user, pass, callback) {
  var SSHClient = require('ssh2-promise');

  var sshconfig = {
    host: serverIP,
    port: 22,
    username: user,
    password: pass,
    tryKeyboard: true
  }
  console.log('I\'ve reached executeSSHPromise for command: ' + command)
  var connection = new SSHClient(sshconfig);
  try {
    connection.exec(command).then((data) => {
            console.log('data:')
            console.log(data)
            var stringData = data.toString();
            //remove the last end-of-line character
            stringData = stringData.slice(0, -1);
            stringData = stringData.split("\n");
            callback(null, stringData);	  
    });
  } catch(err) {
    console.log(err)
    callback(' user:' + user + '/serverIP:' + serverIP + '/ssh2 error: ' + err);
  }
}

//const socket = await ssh.shell();
//const waitForDataAsync = socket => new Promise(resolve => socket.on('data', resolve));


function executeSSHCommand(serverIP, command, user, pass, callback) {
  var sshClient = require('ssh2').Client;
	var connection = new sshClient();
  try {
    connection.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
      finish([pass]);
    }).on('ready', function() {
      connection.exec(command, function(err, stream) {
        if (err) throw err;
        stream.on('close', function(code, signal) {
          connection.end();
        }).on('data', function(data) {
          var stringData = data.toString();
          //remove the last end-of-line character
          stringData = stringData.slice(0, -1);
          stringData = stringData.split("\n");
          callback(null, stringData);
        }).stderr.on('data', function(data) {
          console.log('STDERR: ' + data);
        });
      });
    });
      
    connection.connect({
      host: serverIP,
      port: 22,
      username: user,
      password: pass,
      tryKeyboard: true
    });
    
    connection.on('error', function(err) {
      callback('user:' + user + '/serverIP:' + serverIP + '/ssh2 error: ' + err);
    });
  } catch(err) {
    callback(' user:' + user + '/serverIP:' + serverIP + '/ssh2 error: ' + err);
  }
}

const executeSSHCommandPromise = (server, execCommand) => { 
  return new Promise((resolve, reject) => {
     try {
        var user = null;
        var pass = null;
        user = conn.getLinuxDbUserName();
        pass = conn.getLinuxDbPassword();
        executeSSHPromise(server, execCommand, user, pass, function(err, sshCommandOutput){
           if (err) { reject(err) } else {
              resolve(sshCommandOutput);
           } 
        })
     } catch (error) {
        reject(error)
     }
  })
}

const executeQueryPromise = (cn, query) => { 
  return new Promise((resolve, reject) => {
     try {
      var ibmdb = require('ibm_db');
      ibmdb.open([cn], {connectTimeout : 120}, function (err, connection) {
        if (err) {
            reject(err)
         } else {
           connection.query(query, function (err, rows) {
              if (err) {
                  reject(err)
              } else {
                  connection.close()
                  resolve(rows)
              }
            });
         }
       });
     } catch (error) {
        reject(error)
     }
  })
}

exports.compareTS = compareTS;
exports.validateEnvironment = validateEnvironment;
exports.getCurrentDateTimeStamp = getCurrentDateTimeStamp;
exports.getCurrentDate = getCurrentDate;
exports.environments = environments;
exports.executeSSHCommand = executeSSHCommand;
exports.executeQueryPromise = executeQueryPromise
exports.executeSSHPromise = executeSSHPromise
exports.executeSSHCommandPromise = executeSSHCommandPromise;