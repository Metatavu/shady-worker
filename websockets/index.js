(function() {
  'use strict';
  
  var _ = require('underscore');
  var EventEmitter = require('events');
  var util = require('util');
  var WebSocketServer = require('websocket').server;
  
  class Client extends EventEmitter {
    constructor (connection, sessionId) {
      super();
    
      this.connection = connection;
      this.sessionId = sessionId;
    
      connection.on('message', function (message) {
        this._onConnectionMessage(connection, message);
      }.bind(this));
      
      connection.on('close', function (reasonCode, description) {
        this._onConnectionClose(connection, reasonCode, description);
      }.bind(this));
    }
    
    sendMessage (type, data) {
      this._sendMessage(this.connection, JSON.stringify({
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
    
    _onConnectionMessage (connection, message) {
      switch (message.type) {
        case 'utf8':
          var message = JSON.parse(message.utf8Data);
          this.emit("message", {
            sessionId: this.sessionId,
            type: message.type, 
            data: message.data
          });
        break;
      }
    }
    
    _onConnectionClose (connection, reasonCode, description) {
      this.emit("close", {
        sessionId: this.sessionId
      });
    }
  }
    
  class WebSockets extends EventEmitter {
  
    constructor (httpServer) {
      super();
    
      this._server = new WebSocketServer({
        httpServer: httpServer
      });
      
      this._server.on("connection", this._onServerConnection.bind(this));
      this._server.on("request", this._onServerRequest.bind(this));
    }
    
    _onServerConnection (webSocket) {
      var url = webSocket.upgradeReq.url;
    }
    
    _onServerRequest (request) {
      var urlParts = request.resourceURL.path.split('/');
      var sessionId = _.last(urlParts);
      // TODO: is it really acceptable?
      var connection = request.accept();
      var client = new Client(connection, sessionId);

      client.on("message", function (message) {
        this.emit(message.type, _.extend(message.data, {
          client: client,
          sessionId: message.sessionId
        }));
      }.bind(this));
      
      client.on("close", function () {
        // client left
      });
    }
  
  };
  
  module.exports = WebSockets;
  
}).call(this);