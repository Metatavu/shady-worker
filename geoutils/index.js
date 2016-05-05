(function() {
  'use strict';
  
  var util = require('util');
  var sgeo = require('sgeo');
  var geolib = require('geolib');
  
  class GeoUtils {
  
    static center() {
      return geolib.getCenter(arguments);
    }
  
    static bearingTo(from, to) {
      return (new sgeo.latlon(from.latitude, from.longitude))
        .bearingTo(new sgeo.latlon(to.latitude, to.longitude));
    }
    
    static speed(from, fromTime, to, toTime) {
      return geolib.getSpeed(
        {lat: from.latitude, lng: from.longitude, time: fromTime },
        {lat: to.latitude, lng: to.longitude, time: toTime }
      );
    }

    static kmInMin(kmh) {
      return kmh / 60;
    }
    
    static kmInSec(kmh) {
      return this.kmInMin(kmh) / 60;
    }
    
    static kmInMs(kmh) {
      return this.kmInSec(kmh) / 1000;
    }
    
    static calculateDestination (coordinate, distance, bearing) {
      return geolib.computeDestinationPoint(coordinate, distance, bearing);
    }
  
  };
  
  module.exports = GeoUtils;
  
}).call(this);