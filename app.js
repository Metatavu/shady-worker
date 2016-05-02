(function() {
  'use strict';
  
  var http = require('http');
  var util = require('util');
  var express = require('express');
  var uuid = require('uuid4');
  var pidusage = require('pidusage');
  var geolib = require('geolib');
  
  var ShadyMessages = require('shady-messages');
  var WebSockets = require(__dirname + '/websockets');
  var Places = require(__dirname + '/places/places.js');
  
  var shadyMessages = new ShadyMessages();
  var app = express();
  var workerId = uuid();
  var places = new Places();
  
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
  
  var httpServer = http.createServer(app);
	
  httpServer.listen(port, function() {
    console.log('Server is listening on port ' + port);
  });
  
  app.use(express.static(__dirname + '/public'));
  
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
  
  webSockets.on("player:screen-move", function (connection, data) {
    var center = geolib.getCenter([
      data.topLeft,
      data.bottomRight
    ]);
      
    places.search(center.latitude, center.longitude, function (err, places) {
      if (err) {
        // todo: handle err
        console.error(err);
      } else {
        webSockets.sendMessage(connection, "places:near", { places: places });
      }
    });
  });
  
  webSockets.on("system:reindex-places", function (connection, data) {
    shadyMessages.trigger("system:reindex-places", { });
  });
  
  console.log(util.format("Worker started at %s:%d", host, port));
  
}).call(this);