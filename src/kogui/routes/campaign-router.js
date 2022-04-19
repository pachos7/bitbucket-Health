var router = require('express').Router()
var campaign = require('../models/campaign-model')
var helpers = require('../models/helpers')

function getCampaignDetails (req, res) {
  campaign.getCampaignDetails(req.params.campaignName, function (err, inCampaignName, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding campaign details for ' + req.params.campaignName + ':' + err
      });
    } else if (result && result[0]) {
        if (result[0].EXECUTIONS) {
          result[0].EXECUTIONS.sort(helpers.compareTS("START_TS","desc")); 
        }
        res.render('campaign-details',{
          campaignName: inCampaignName,
          campaignInfo: result[0],
        });        
    } else {
        res.render('campaign-details',{
          campaignName: inCampaignName,
          campaignInfo: null,
        });
    }
  });
}

function updateCampaignExecutionsInfo (req, res) {
  campaign.updateSingleCampaignExecutionDetails(req.params.campaignName, function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding campaign details for ' + req.params.campaignName + ' in App Metadata:' + err
      });
    } else {
       res.redirect('/campaign/getCampaignDetails/' + req.params.campaignName);
    }
  });
}

function getRunInstanceDetails (req, res) {
  campaign.getRunInstanceDetails(req.params.runInstance, function (err, campaignInformation, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding Run Instance details for ' + req.params.runInstance + ' in App Metadata:' + err
      });
    } else {
       res.render('runInstance',{
        runInstance: req.params.runInstance,
        campaignInformation: campaignInformation,
        runInstanceProcessList: result,
       });
    }
  });
}


function updateCampaignTableOperations (req, res) {
  campaign.updateTableOperationDetailsByCampaign(req.params.campaignName, function (err) {
     if (err) {
       res.status(500).render('error', {
          message: 'Error finding details for campaign ' + req.params.campaignName + ' operations in App Metadata:' + err
       });
     } else {
        res.redirect('/space/getOrjobsSpaceByFilter/' + req.params.environment + '/Campaign/' + req.params.campaignName);
     }
  });
}

function updateCampaignInfo (req, res) {
  campaign.getCampaignsInfoFromMetadata(function (err) {
    if (err) {   
       res.status(500).render('error', {
          message: 'Error getCampaignsInfoFromMetadata:' + err
       });
    } else {
       var space = require('../models/space-model');
       space.updateTablesWithCampaignsInfo(function (err) {
          if (err) { 
              res.status(500).render('error', {
              message: 'Error updateTablesWithCampaignsInfo:' + err
              });
          } else {
            campaign.updateAllCampaignsExecutionInfo(function (err) {
              if (err) { 
                 res.status(500).render('error', {
                 message: 'Error trying to update the campaigns execution info:' + err
                 });
              } else {
                 console.log(' Campaign information update completed'); 
              }
            });
          }
       });
       res.render('dashboard', {
          message:'Campaign information update in Progress'
       });
    }
  });
}

function getExecutingCampaigns (req, res) {
    campaign.getCampaignsFromMetadata('executing', function (err, inExecutionCampaigns) {
    if (err) {   
       res.status(500).render('error', {
          message: 'Error getCampaignsFromMetadata:' + err
       });
    } else {
      res.render('campaigns',{
        title: 'Campaigns in Execution',
        campaignsList: inExecutionCampaigns
     });

    }
  });
}

function getFailedCampaigns (req, res) {
  campaign.getCampaignsFromMetadata('failed', function (err, failedCampaigns) {
    if (err) {   
       res.status(500).render('error', {
          message: 'Error getCampaignsFromMetadata:' + err
       });
    } else {
      res.render('campaigns',{
        title: 'Campaigns Failed',
        campaignsList: failedCampaigns
     });

    }
  });
}

function getQueuedCampaigns (req, res) {
  campaign.getCampaignsFromMetadata('queued', function (err, queuedCampaigns) {
    if (err) {   
       res.status(500).render('error', {
          message: 'Error getCampaignsFromMetadata:' + err
       });
    } else {
      res.render('campaigns',{
        title: 'Campaigns Queue',
        campaignsList: queuedCampaigns
     });

    }
  });
}

function convert2Link(inList, linkExpression) {
  var linksList = []
  inList.forEach(item => 
    linksList.push(linkExpression.replace(/@@@/g, item))
   );
  return linksList;
}


function getClientsByCampaigns (req, res) {
  campaign.getClientsByCampaignsFromCampaignsList(function (err, clientsListByCampaigns) {
    if (err) {   
      res.status(500).render('error', {
          message: 'Error getClientsByCampaignsFromCampaignsList:' + err
      });
    } else {
      res.render('generic-list',{
        title: 'Clients',
        genericList: convert2Link(clientsListByCampaigns, '<a href="/campaign/getAccountsByClient/@@@">@@@</a>')
    });

    }
  });
}

function getAccountsByClient (req, res) {
  campaign.getAccountsByClientsFromCampaignList(req.params.clientName, function (err, accountsList) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding accounts details for client' + req.params.clientName + ':' + error
      });
    }

    if (accountsList === 'undefined' || accountsList === null || accountsList.length == 0) {
      res.status(500).render('error', {
          message: 'No accounts information found for client ' + req.params.clientName
      });
    } else {
      res.render('generic-list',{
         title: req.params.clientName + ' - Accounts',
         genericList: convert2Link(accountsList, '<a href="/campaign/getCampaignsByAccount/@@@">@@@</a>')
      });
    }    
  });
}

function updateCampaignsByAccountNumber(req, res) {
  campaign.updateCampaignsFromMetadataByAccountNumber(req.params.accountNumber,function (err) {
    if (err) {
      res.status(500).render('error', {
          message: 'error updating campaigns for account ' + req.params.accountNumber + ':' + err
      });
    } else {
      res.redirect('/campaign/getCampaignsByAccount/' + req.params.accountNumber);
    }

  });
}

function getCampaignsByAccount (req, res) {
  campaign.getCampaignsByAccountFromCampaignList(req.params.accountNumber, function (err, campaignsList) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding campaigns for account ' + req.params.accountNumber + ':' + err
      });
    }

    if (campaignsList === 'undefined' || campaignsList === null || campaignsList.length == 0) {
      res.status(500).render('error', {
          message: 'No campaigns found for account ' + req.params.accountNumber
      });
    } else {
      res.render('generic-list',{
         title: req.params.accountNumber + ' - Campaigns',
         genericList: convert2Link(campaignsList, '<a href="/campaign/getCampaignDetails/@@@">@@@</a>'),
         additionalHTML: '<a href="/campaign/updateCampaignsByAccountNumber/' + req.params.accountNumber + '"><button class="btn btn-dark ">Update campaings Info</button></a>'
      });
    }    
  });
}


router.get('/getCampaignDetails/:campaignName', getCampaignDetails);
router.get('/updateCampaignExecutionsInfo/:campaignName', updateCampaignExecutionsInfo);
router.get('/getRunInstanceDetails/:runInstance', getRunInstanceDetails);
router.get('/updateCampaignTableOperations/:campaignName', updateCampaignTableOperations);
router.get('/updateCampaignInfo', updateCampaignInfo);
router.get('/getExecutingCampaigns', getExecutingCampaigns);
router.get('/getClientsByCampaigns', getClientsByCampaigns);
router.get('/getFailedCampaigns', getFailedCampaigns);
router.get('/getQueuedCampaigns', getQueuedCampaigns);
router.get('/getAccountsByClient/:clientName', getAccountsByClient)
router.get('/getCampaignsByAccount/:accountNumber', getCampaignsByAccount)
router.get('/updateCampaignsByAccountNumber/:accountNumber', updateCampaignsByAccountNumber)
module.exports = router
