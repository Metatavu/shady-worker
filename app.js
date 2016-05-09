(function() {
  'use strict';
  
  var _ = require("underscore");
  var http = require('http');
  var util = require('util');
  var express = require('express');
  var morgan = require('morgan');
  var bodyParser = require('body-parser');
  var uuid = require('uuid4');
  var pidusage = require('pidusage');
  
  var ShadyModel = require('shady-model');
  
  var WebSockets = require(__dirname + '/websockets');
  var Sessions = require(__dirname + '/sessions');
  var Places = require(__dirname + '/places/places.js');
  var GeoUtils = require(__dirname + '/geoutils');
  var config = require(__dirname + '/config.json');
  var shadyMessages = require('shady-messages').getInstance();

  var workerId = uuid();
  var argv = require('yargs')
    .usage('Start Shady worker \nUsage: $0')
    .demand('p')
    .alias('p', 'port')
    .describe('p', 'Port')
    .demand('h')
    .alias('h', 'host')
    .describe('h', 'Host')
    .argv;
  
  var port = argv.port;
  var host = argv.host;
  
  shadyMessages.on("models:ready", function () {

    var app = express();
    var places = new Places({
      elasticSearchHost: config.elasticSearchHost
    });
    
    var sessions = new Sessions();
  
    var httpServer = http.createServer(app);
    
    httpServer.listen(port, function() {
      console.log('Server is listening on port ' + port);
    });
  
    app.use(morgan('combined'));
    app.use(express.static(__dirname + '/public'));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'pug');
    app.use(bodyParser.urlencoded({ extended: true }));
  
    app.get('/', function (req, res) {
      res.render('index', { });
    });
  
    app.post('/rest/sessions/', function (req, res) {
      var id = req.body.id;
      var longitude = parseFloat(req.body.longitude);
      var latitude = parseFloat(req.body.latitude);
   
      sessions.create(id, latitude, longitude, function (err, sessionId) {
        if (err) {
          console.error(err);
          res.send(500, err);
        } else {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.status(200).send(JSON.stringify({
            sessionId: sessionId
          }));
        }
      });
    });
  
    setInterval(function () {
      pidusage.stat(process.pid, function(err, stat) {
        shadyMessages.trigger("cluster:ping", {
          workerId: workerId,
          host: host,
          port: port,
          cpu: stat.cpu,
          memory: stat.memory
        });
      });
    }, 1000);
  
    var webSockets = new WebSockets(httpServer);

    webSockets.on("player:screen-move", function (data) {
      var sessionId = data.sessionId;
      var client = data.client;
  
      sessions.get(sessionId, function (err, session) {
        if (err) {
          console.error(err);
        } else {
          var currentLocation = GeoUtils.center(data.topLeft, data.bottomRight);
          var user = session.user;
          var bearing = null;
          var speed = null;
          var now = new Date().getTime();
        
          if (user.lastSeenAt) {
            bearing = GeoUtils.bearingTo(user.lastSeenAt, currentLocation);
            speed = GeoUtils.speed(user.lastSeenAt, user.lastSeen, currentLocation, now);
          }

          places.search(currentLocation.latitude, currentLocation.longitude, function (err, places) {
            if (err) {
              console.error(err);
            } else {
              client.sendMessage("places:near", { places: places });
            }
          });
        
          sessions.update(sessionId, { 
            user: _.extend(user, {
              lastSeen: now,
              lastSeenAt: currentLocation,
              bearing: bearing,
              speed: speed
            })
          }, function (updateErr) {
            if (updateErr) {
              console.error(updateErr);
            }
          });
        }
      });
    });

    webSockets.on("system:reindex-places", function (connection, data) {
      shadyMessages.trigger("system:reindex-places", { });
    });
  });
  
  
  ShadyModel.createInstance({
    cassandraContactPoints: config.cassandraContactPoints,
    cassandraProtocolOptions: config.cassandraProtocolOptions,
    cassandraKeyspace: config.cassandraKeyspace
  });
  
  console.log(util.format("Worker started at %s:%d", host, port));
  
}).call(this);