/*jshint esversion: 6 */

(function() {
  'use strict';
  
  var _ = require("underscore");
  var util = require('util');
  var redis = require("redis");
  var uuid = require('uuid4');
  var ShadyModel = require('shady-model');
  
  class Sessions {
  
    constructor () {
      this._redisClient = new redis.createClient();
    }
    
    create (userId, latitude, longitude, callback) {
      var lastSeen = new Date().getTime();
      var lastSeenAt = { latitude: latitude, longitude: longitude };
      
      this._findOrCreateUser(userId, function (err, user) {
        if (err) {
          callback(err);
        } else {
          var sessionId = uuid();
	      var sessionData = {
	        user: _.extend(user, {
	          lastSeen: lastSeen,
	          lastSeenAt: lastSeenAt
	        })
	      };

	      this._redisClient.set(util.format("session-%s", sessionId), JSON.stringify(sessionData), function (sessErr) {
	        if (sessErr) {
	          callback(sessErr);
	        } else {
	          callback(null, sessionId);
	        }
	      }.bind(this));
        }
      }.bind(this));
    }
    
    _findOrCreateUser(id, callback) {
      var UserModel = ShadyModel.User;

      UserModel.findOne({id: id}, function(findErr, user){
        if (findErr) {
          callback(findErr);
        } else {
          if (!user) {
            (new UserModel({
              id: id,
              displayName: "Fakey McFakeyface"
            })).save(callback);
          } else {
            callback(null, user);
          }
        }
      });
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
  
  }
  
  module.exports = Sessions;
  
}).call(this);