var space = require('../models/space-model')
var table = require('../models/table-model')
var router = require('express').Router()

function getOrjobsSpace (req, res) {
  space.getOrjobsSpace(req.params.env, function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      res.render('space-details',{
         totalSpace: result.totalSpace,
         environment: req.params.env,
         spaceDetails: result.spaceDetails,
         filterType:null,
         filterValue:null,
         summary:null,
      });  
    }    
  });
}

function getOrjobsSpaceSummary (req, res) {
  space.getOrjobsSpaceSummary(req.params.env, req.params.filterType, function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
       res.render('space-details', {
         totalSpace: result.totalSpace,
         environment: req.params.env,
         spaceDetails: result.spaceDetails,
         filterType: req.params.filterType,
         filterValue:null,
         summary:'yes',
       });
    }
  });
}

function getOrjobsSpaceByFilter (req, res) {
  space.getOrjobsSpaceByFilter(req.params.env, req.params.filterType, req.params.filterValue, function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      res.render('space-details',{
        totalSpace: result.totalSpace,
        environment: req.params.env,
        spaceDetails: result.spaceDetails,
        filterType:req.params.filterType,
        filterValue:req.params.filterValue,
        summary:null,
      });
    }
  });
}

function getAllOrjobsTablesSizes (callback) {
  var helpers = require('../models/helpers');
  var environments = helpers.environments;
  environments.forEach(function(thisEnvironment, idx) {
    space.updateOrjobsSpaceByEnvironment(thisEnvironment, function (err, result) {
      if (err) {
         if (idx == environments.length - 1) callback(err);
      } else {
        space.saveTotalOrjobsSpaceByEnvironmentInPulse(thisEnvironment, function(err){
            if (err) callback(err);
        });
        if (idx === environments.length - 1) {
           callback(null);
        }
      }
    });
  });
}

function updateOrjobsSpace (req, res) {
  getAllOrjobsTablesSizes(function (err) {
    if (err) {
      res.status(500).render('error', {
          message: err
      });
    } else {
      table.updateDoNotDropTablesTag(function (err) {
        if (err) callback(err); 
        res.redirect('/');
      });
    }
  });
}

// Get information from local app MongoDB
router.get('/getOrjobsSpace/:env', getOrjobsSpace);
router.get('/getOrjobsSpaceSummary/:env/:filterType', getOrjobsSpaceSummary);
router.get('/getOrjobsSpaceByFilter/:env/:filterType/:filterValue', getOrjobsSpaceByFilter);

// Get information from remote App servers to store in local app MongoDB
router.get('/updateOrjobsSpace', updateOrjobsSpace);


module.exports = router
