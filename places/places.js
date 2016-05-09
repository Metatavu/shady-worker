/*jshint esversion: 6 */

(function() {
  'use strict';
  
  var _ = require("underscore");
  var async = require("async");
  var Search = require("shady-search");
  var ShadyModel = require('shady-model');
  
  class Places {
    
    constructor(options) {
      this._search = new Search({
        elasticSearchHost: options.elasticSearchHost
      });
    }
    
    _searchFromIndex (latitude, longitude, callback) {
      this._search.searchPlacesNear(latitude, longitude, function (err, response) {
        if (err) {
          callback(err);
        } else {
          if (response && response.hits) {
            var ids = _.pluck(response.hits.hits, '_id');
            ShadyModel.Place.find({ id : { '$in': ids }}, function (loadErr, places) {
              callback(loadErr, places);
            }.bind(this));
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
    
  }
  
  module.exports = Places;

}).call(this);