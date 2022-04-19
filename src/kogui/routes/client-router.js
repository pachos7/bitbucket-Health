var router = require('express').Router()
var client = require('../models/client-model')
var helpers = require('../models/helpers')

function getClients (req, res) {
  client.getClientsList(function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding clients list :' + err
      });
    } else if (result) {
        res.render('clients',{
          clientsList: result,
        });        
    } else {
        res.render('clients',{
          clientsList: null,
        });
    }
  });
}

function getClientsDeliveryMappings (req, res) {
  client.getClientsDeliveryMappingsList(function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding clients delivery mappings :' + err
      });
    } else if (result) {
        res.render('delivery-mappings',{
          deliveryMappingList: result,
        });        
    } else {
        res.render('delivery-mappings',{
          deliveryMappingList: null,
        });
    }
  });
}

function updateClients (req, res) {
  client.updateClientsList(function (err) {
    if (err) {   
       res.status(500).render('error', {
          message: 'Error updateClientsList:' + err
       });
    } else {
      res.redirect('/client/getClients');
    }
  });
}

function getClientDetails (req, res) {
  client.getClientDetailsData(req.params.clientName, function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'error finding clients details :' + err
      });
    } else if (result) {
        res.render('clients-details',{
          clientData: result,
        });        
    } else {
        res.render('clients-details',{
          clientData: null,
        });
    }
  });
}

function createNewClientsDeliveryMapping (req, res) {
    client.validateNewDeliveryMapping(req.body, function (err, result) {
    if (err) {
      res.status(500).render('error', {
          message: 'Error validating new Client Delivery Mapping:' + err
      });
    } else {
      client.insertNewClientDeliveryMapping(req.body, function (err, result) {
        if (err) {
          res.status(500).render('error', {
            message: 'Error inserting new Client Delivery Mapping::' + err
          });
        } else {
          res.redirect('/client/details/' + req.body.clientName);
        }
      });
    }
  });
}

router.get('/getClients', getClients);
router.get('/updateClients', updateClients);
router.get('/details/:clientName', getClientDetails);
router.get('/getClientsDeliveryMappings', getClientsDeliveryMappings)

router.post('/createClientsDeliveryMapping', createNewClientsDeliveryMapping)
module.exports = router
