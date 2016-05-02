(function() {
  'use strict';
  
  var _ = require("underscore");
  var async = require("async");
  var Search = require("shady-search");
  var Database = require('shady-database');
  var config = require(__dirname + '/../config.json');
  
  class Places {
    
    constructor() {
      this._database = new Database({
        cassandraContactPoints: config.cassandraContactPoints,
        cassandraKeyspace: config.cassandraKeyspace
      });
      
      this._search = new Search({
        elasticSearchHost: config.elasticSearchHost
      });
    }
    
    _searchFromIndex (latitude, longitude, callback) {
      this._search.searchPlacesNear(latitude, longitude, function (err, response) {
        if (err) {
          callback(err);
        } else {
          if (response && response.hits) {
            var ids = _.pluck(response.hits.hits, '_id');
            this._database.Places.load(ids, function (err, places) {
              callback(err, places);
            });
          } else {
            callback(null, []);
          }
        }
      }.bind(this));
    }
    
    search (latitude, longitude, mainCallback) {
      this._searchFromIndex(parseFloat(latitude), parseFloat(longitude), function (indexErr, searchResults) {
        if (indexErr) {
          mainCallback(indexErr);
        } else {
          if (searchResults && searchResults.length) {
            mainCallback(null, searchResults);
          } else {
            mainCallback(null, []);
          }
        }
      }.bind(this));
    }
    
  };
  
  module.exports = Places;

}).call(this);