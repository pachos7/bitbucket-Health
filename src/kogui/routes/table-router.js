var router = require('express').Router()
var table = require('../models/table-model')
var helpers = require('../models/helpers')

function getTableDetails (req, res) {
  table.getTableDetails(req.params.tableName, function (err, tableName, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'Error finding Table details for ' + req.params.tableName + ':' + err
      });
    } else {
      
      if (result[0] !== undefined) {
        if (result[0].OPERATIONS !== undefined)
           result[0].OPERATIONS.sort(helpers.compareTS("REQUEST_TS","desc")); 
      }
      
      res.render('table-details',{
      tableName: tableName,
	  tableInfo: result[0],
      });                
    }
  });
}

function updateDoNotDropTablesTag (req, res) {
  table.updateDoNotDropTablesTag(function (err) {
    if (err) {
      res.status(500).render('error', {
          message: 'Error updating Do Not Drop Tables Tag:' + err
       });
    } else {
       res.redirect('/');
    }
  });
}

function getDoNotDropTablesList (req, res) {
  table.getDoNotDropTablesList(function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'Error getting the doNotDropTables list: ' + err
      });    
    } else {
      var tablesInfo = []
      tablesInfo.push(new Array("Table Name"));
      result.forEach(function(item) {
        tablesInfo.push(new Array(item));
      });
      res.render('generic-table-details',{
        title: 'Do Not Drop Tables List',
        tableHeader: [["Table Count", result.length], 
                      ["Document Link", 'https://confluenceglobal.?????.local/confluence/display/CBS/BS+????'],
                      ["Document Name", 'Do-Not-Drop Table List.xlsx']],
        tableContent: tablesInfo,
      });
    }
  });
}

function tableSearch (req, res) {
   res.render('search-element',{
     searchByTable: 'Yes',
   });
}

function searchTable (req, res) {
   res.redirect('/table/getTableDetails/' + req.body.tableName);
}

function updateSingleTableOperationDetails (req, res) {
  table.updateSingleTableOperationDetails(req.params.tableName, function (err, opsCount) {
    if (err) {
      res.status(500).render('error', {
          message: 'Error finding details for ' + req.params.tableName + ' operations in App Metadata:' + err
      });
    } else {
       res.redirect('/table/getTableDetails/' + req.params.tableName);
    }
  });
}

router.post('/searchTableDetails/', searchTable);
router.get('/getTableDetails', tableSearch);
router.get('/getTableDetails/:tableName', getTableDetails);
router.get('/updateDoNotDropTablesTag', updateDoNotDropTablesTag);
router.get('/getDoNotDropTablesList', getDoNotDropTablesList);
router.get('/updateTableOperationsInfo/:tableName', updateSingleTableOperationDetails);


module.exports = router
