(function() {
  'use strict';
  
  var EventEmitter = require('events');
  var util = require('util');
  var WebSocketServer = require('websocket').server;
    
  class WebSockets extends EventEmitter {
  
    constructor (httpServer) {
      super();
    
      this._server = new WebSocketServer({
        httpServer: httpServer
      });
      
      this._server.on("connection", this._onServerConnection.bind(this));
      this._server.on("request", this._onServerRequest.bind(this));
    }
    
    sendMessage (connection, type, data) {
      this._sendMessage(connection, JSON.stringify({
        type: type,
        data: data
      }));
    } 
    
    _sendMessage (connection, message) {
      connection.sendUTF(message);
    }
    
    _sendBinary (connection, binaryData) {
      connection.sendBytes(binaryData);
    }
    
    _onServerConnection (webSocket) {
      var url = webSocket.upgradeReq.url;
    }
    
    _onServerRequest (request) {
      var connection = request.accept();
      
      connection.on('message', function (message) {
        this._onConnectionMessage(connection, message);
      }.bind(this));
      
      connection.on('close', function (reasonCode, description) {
        this._onConnectionClose(connection, reasonCode, description);
      }.bind(this));
    }
    
    _onConnectionMessage (connection, message) {
      switch (message.type) {
        case 'utf8':
          var message = JSON.parse(message.utf8Data);
          this.emit(message.type, connection, message.data);
        break;
      }
    }
    
    _onConnectionClose (connection, reasonCode, description) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    }
  
  };
  
  module.exports = WebSockets;
  
}).call(this);