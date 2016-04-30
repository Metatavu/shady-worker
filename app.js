(function() {
  'use strict';
  
  var http = require('http');
  var util = require('util');
  var express = require('express');
  var uuid = require('uuid4');
  var pidusage = require('pidusage');
  
  var ShadyMessages = require('shady-messages');
  var WebSocketServer = require('websocket').server;
  
  var shadyMessages = new ShadyMessages();
  var app = express();
  var workerId = uuid();
  var clients = 0;
  
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
    
  var wsServer = new WebSocketServer({
    httpServer: httpServer
  });
  
  wsServer.on('connection', function (webSocket) {
    console.log("connection");
    var url = webSocket.upgradeReq.url;
  });
  
  wsServer.on('request', function(request) {
    var connection = request.accept();
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
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
  
  console.log(util.format("Worker started at %s:%d", host, port));
  
}).call(this);