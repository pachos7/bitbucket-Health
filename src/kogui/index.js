var express = require('express')

var app = express()

var bodyParser = require('body-parser');
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.use(require('./routes/site-router'))
app.use('/space', require('./routes/space-router'))
app.use('/campaign', require('./routes/campaign-router'))
app.use('/client', require('./routes/client-router'))
app.use('/export', require('./routes/export-router'))
app.use('/build', require('./routes/build-router'))
app.use('/table', require('./routes/table-router'))
app.use('/server', require('./routes/server-router'))
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'))
app.use('/js',  express.static(__dirname + 'node_modules/bootstrap/dist/js'))
app.use('/js',  express.static(__dirname + 'node_modules/jquery/dist'))

// Finally, use any error handlers
app.use(require('./routes/not-found'))

module.exports = app