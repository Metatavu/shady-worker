(function() {
  'use strict';
  
  var util = require('util');
  var redis = require("redis");
  var uuid = require('uuid4');
  var model = require('shady-model');
  
  class Sessions {
  
    constructor () {
      this._redisClient = new redis.createClient();
    }
    
    create (userId, latitude, longitude, callback) {
      var lastSeen = new Date().getTime();
      var lastSeenAt = { latitude: latitude, longitude: longitude };
      var bearing = null;
      var speed = null;
      
      var user = new model.User(userId, lastSeen, lastSeenAt, bearing, speed);
      var sessionId = uuid();
      var sessionData = {
        user: user
      };
        
      this._redisClient.set(util.format("session-%s", sessionId), JSON.stringify(sessionData), function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, sessionId);
        }
      }.bind(this));
    }
    
    get (sessionId, callback) {
      this._redisClient.get(util.format("session-%s", sessionId), function (err, data) {
        if (err) {
          callback(err);
        } else {
          callback(null, JSON.parse(data));
        }
      });
    }
    
    update (sessionId, sessionData, callback) {
      this._redisClient.set(util.format("session-%s", sessionId), JSON.stringify(sessionData), function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, sessionId);
        }
      }.bind(this));
    }
  
  };
  
  module.exports = Sessions;
  
}).call(this);