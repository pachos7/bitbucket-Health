var router = require('express').Router()
var build = require('../models/build-model')

function getPostETLStatus(req, res) {
  build.getPostETLStatusDetails('some-param', function (err, logFileName, logInfo, dashboardInfo) {
    if (err) {
      res.status(500).render('error', {
        message: 'error :' + err
      });
    } else {
      res.render('build-details',{
         buildType: 'Post-ETL',
         logFileName: logFileName,
	       buildInfo: logInfo,
         dashboardInfo: dashboardInfo
      });
    }    
  });
}

function getOnGoingStatus (req, res) {
  build.getOnGoingStatusDetails('some-param', function (err, logFileName, logInfo) {
    if (err) {
      res.status(500).render('error', {
          message: 'error :' + err
      });
    } else {
       res.render('build-details',{
        logFileName: logFileName,
        buildInfo: logInfo,
       });
    }
  });
}

router.get('/getPostETLStatus', getPostETLStatus);
router.get('/getOnGoingStatus', getOnGoingStatus);

module.exports = router
