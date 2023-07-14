var express = require('express')
var join = require('path').join

var router = new express.Router()

function help (req, res) {
  res.render('help')
}

router.use(express.static(join(__dirname, '../public')))
router.get('/', home)
router.get('/help', help)

function home (req, res) {
  var conn = require('../routes/db');
  var db = conn.getMongoDb();
  
  if (db == null) {
    res.render('dashboard');
  } else {
    var server = require('../models/server-model');
    server.getNASInfo(function(err, NASInfo) {
       if (err) console.log(err);
    
       var pulse = require('../models/pulse-model');
       pulse.getMostRecentPulse(function(err, pulse) {
          if (err) {
            res.status(500).render('error', {
               message: 'Error finding pulse details: ' + err
            });
          }
          res.render('dashboard',{
            pulse: pulse,
            NASInfo: NASInfo,
          });
       });
    });
  }
}

function test (req, res) {
   res.status(200).send('Test completed');
}

router.get('/test', test)

module.exports = router
