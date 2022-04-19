var router = require('express').Router()
var exportx = require('../models/export-model')

function getExports (req, res) {
  exportx.getDatatransfersStatus(function (err, dataTransfersLinuxData, dataTransfersAIXData) {
    if (err) { res.status(500).render('error', { message: 'Error getting Data transfer status' + err});
    } else {
      console.log(dataTransfersLinuxData)
      console.log(dataTransfersAIXData)
      res.render('exports',{
        dataTransfersData: dataTransfersLinuxData
       });
    }
  });
}

router.get('/getExports', getExports)

module.exports = router
