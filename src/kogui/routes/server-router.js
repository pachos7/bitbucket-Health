var router = require('express').Router()
var server = require('../models/server-model') 

function getAllDBFileSystemsInfo (req, res) {
  server.getAllDBFileSystemsInfo(function (err) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      res.redirect('/');
    }
  });
}

function updateNASInfo (req, res) {
  server.updateNASInfo(function (err) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      res.redirect('/');
    }
  });
}

function getHouseKeepingStatus (req, res) {
  server.getHouseKeepingDaemonsStatus(function (err) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      server.getHouseKeepingOperationsStatus(function (err) {
        if (err) {
          res.status(500).render('error', {
              message: err
          });
        } else {
          res.redirect('/server/housekeeping');
        }
      });
    }
  });
}

function housekeeping (req, res) {
  server.getHouseKeepingInfo(function(err, houseKeepingInfo) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      if (typeof houseKeepingInfo === "undefined" || houseKeepingInfo === null) {
        res.render('housekeeping',{
          houseKeepingInfoDate: null,
          houseKeepingDaemonInfo: null,
          houseKeepingOperationsInfo: null,
        });
      } else {
        res.render('housekeeping',{
          houseKeepingInfoDate: houseKeepingInfo.DATE,
          houseKeepingDaemonInfo: houseKeepingInfo.houseKeepingDaemonInfo,
          houseKeepingOperationsInfo: houseKeepingInfo.houseKeepingOperationsInfo,
        });
      }
    }
  });
}

function getFileSystemStatus (req, res) {
  server.getFileSystemStatus(function(err) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      res.redirect('/server/filesystem');
    }
  });
}

function filesystem (req, res) {
  server.getFileSystemInfo(function(err, fileSystemInfo) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      if (typeof fileSystemInfo === "undefined" || fileSystemInfo === null) {
         res.render('filesystem',{
           fileSystemInfoDate: null
         });
      } else {
         res.render('filesystem',{
           fileSystemInfoDate: fileSystemInfo.DATE,
           fileSystemInfo: fileSystemInfo.fileSystemInfo.sort((a,b) => (a.usage > b.usage) ? -1 : ((b.usage > a.usage) ? 1 : 0)),        
         });
      }
    }
  });
}

router.get('/getAllDBFileSystemsInfo', getAllDBFileSystemsInfo);
router.get('/updateNASInfo', updateNASInfo);

router.get('/getHouseKeepingStatus', getHouseKeepingStatus);
router.get('/housekeeping', housekeeping);

router.get('/getFileSystemStatus', getFileSystemStatus);
router.get('/filesystem', filesystem);

module.exports = router

