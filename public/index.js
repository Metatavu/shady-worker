(function() {
  'use strict';
  
  /* global window, document, WebSocket, MozWebSocket, $, _, L, navigator, geolib: true */
  
  $.widget("custom.map", {
    options: {
      followInterval: 1,
      changeInterval: 50,
      zoom: 25
    },
    
    _create : function() {
      this._map = L.map(this.element[0]).setView([51.505, -0.09], this.options.zoom);
      this._map.addLayer(new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'));
      
      this._center = null;
      this._northEast = null;
      this._southWest = null;
      this._current = null;
      this._map.on("move", $.proxy(this._onMove, this));
      
      navigator.geolocation.watchPosition($.proxy(this._onGeoLocationChange, this));
      $(document).on("discoveredPlaces", $.proxy(this._onDiscoveredPlaces, this));
    },
    
    _onDiscoveredPlaces: function (event, data) {
      $.each(data.places, $.proxy(function (index, place) {
        var marker = L.marker([place.latitude, place.longitude], {
          title: place.name
        }).addTo(this._map);
      }, this));
    },
    
    _onGeoLocationChange: function (position) {
      var current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      if (!this._current || this._getDistance(current, this._current) > this.options.followInterval) {
        this._current = current;
        this._map.setView([current.latitude, current.longitude], this.options.zoom);
        $(document).trigger("geoLocationChange", {
          latitude: current.latitude,
          longitude: current.longitude
        });
      }
    },
    
    _convertLatLng: function (latLng) {
      return {
        latitude: latLng.lat,
        longitude: latLng.lng
      };
    },
    
    _getDistance: function (l1, l2) {
      return geolib.getDistance(l1, l2);
    },
    
    _triggerLocationChange: function () {
      var bounds = this._map.getBounds();
      var center = this._convertLatLng(bounds.getCenter());
      var northEast = this._convertLatLng(bounds.getNorthEast());
      var southWest = this._convertLatLng(bounds.getSouthWest());

      var data = {
        center: center,
        northEast: northEast,
        southWest: southWest,
        topLeft: {
          latitude: northEast.latitude,
          longitude: southWest.longitude
        },
        bottomRight: {
          latitude: southWest.latitude,
          longitude: northEast.longitude
        }
      };
      
      if (this._center) {
        data.centerChange = this._getDistance(this._center, center);
      }

      if (this._northEast) {
        data.northEastChange = this._getDistance(this._northEast, northEast);
      }

      if (this._southWest) {
        data.southWestChange = this._getDistance(this._southWest, southWest);
      }
      
      var hasChanges = data.southWestChange && data.northEastChange && data.centerChange;
      var maxChange = Math.max(data.southWestChange, data.northEastChange, data.centerChange);
      
      if (!hasChanges || maxChange > this.options.changeInterval) {
        this._center = center;
        this._northEast = northEast;
        this._southWest = southWest;
        
        $(document).trigger("mapLocationChange", data);
      }
    },
    
    _onMove: function () {
      this._triggerLocationChange();
    }
  }); 
  
  $.widget("custom.client", {
    options: {
      reconnectTimeout: 3000,
      clientId: null
    },
    _create : function() {
      this._state = 'WAITING_LOCATION';
      this._knownPlaceIds = [];
      this._pendingMessages = [];
      this._restClient = new $.RestClient('/rest/');
      this._restClient.add('sessions'); 
      
      this.element.on('places:near', $.proxy(this._onPlacesNear, this));
      $(document).on("mapLocationChange", $.proxy(this._onMapLocationChange, this));
      $(document).on("geoLocationChange", $.proxy(this._onGeoLocationChange, this));
    },
    
    _connect: function (sessionId) {
      this._state = 'CONNECTING';
      
      this._webSocket = this._createWebSocket(sessionId);
      if (!this._webSocket) {
        // Handle error  
        return;
      } 
      
      switch (this._webSocket.readyState) {
        case this._webSocket.CONNECTING:
          this._webSocket.onopen = $.proxy(this._onWebSocketOpen, this);
        break;
        case this._webSocket.OPEN:
          this._onWebSocketOpen();
        break;
        default:
          this._reconnect();
        break;
      }
      
      this._webSocket.onmessage = $.proxy(this._onWebSocketMessage, this);
      this._webSocket.onclose = $.proxy(this._onWebSocketClose, this);
      this._webSocket.onerror = $.proxy(this._onWebSocketError, this);
    },
    
    _reconnect: function () {
      console.log("Reconnecting...");

      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
      }
      
      if (!this._webSocket || this._webSocket.readyState !== this._webSocket.CONNECTING) {
        this._connect();
      }
      
      this._reconnectTimeout = setTimeout($.proxy(function () {
        console.log("timeout socket state: " + this._webSocket.readyState);
        
        if (this._webSocket.readyState === this._webSocket.CLOSED) {
          this._reconnect();
        }
      }, this), this.options.reconnectTimeout);
    },

    _createWebSocket: function (sessionId) {
      var port = window.location.port;
      var host = window.location.hostname;
      var url = 'ws://' + host + ':' + port + '/' + sessionId;
      
      if ((typeof window.WebSocket) !== 'undefined') {
        return new WebSocket(url);
      } else if ((typeof window.MozWebSocket) !== 'undefined') {
        return new MozWebSocket(url);
      }
    },
    
    _sendMessage: function (type, data) {
      if (this._state === 'CONNECTED') {
        this._webSocket.send(JSON.stringify({
          type: type,
          data: data
        }));
      } else {
        this._pendingMessages.push({
          type: type,
          data: data
        });
      }
    },
    
    _restCall: function (request, callback) {
      request
        .done(function (result) {
          callback(null, result);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          if ((textStatus === "abort") || (jqXHR.status === 0)) {
            return;
          }
          
          callback(textStatus ? jqXHR.responseText || jqXHR.statusText || textStatus : null, jqXHR);
        });
    },
    
    _createSession: function (latitude, longitude, callback) {
      this._restCall(this._restClient.sessions.create({
        id: this.options.userId,
        latitude: latitude,
        longitude: longitude
      }), callback);
    },
    
    _reindexPlaces: function () {
      this._sendMessage('system:reindex-places', {});
    },
    
    _onWebSocketOpen: function (event) {
      while (this._pendingMessages.length) {
        var pendingMessage = this._pendingMessages.shift();
        this._webSocket.send(JSON.stringify({
          type: pendingMessage.type,
          data: pendingMessage.data
        }));
      }
      
      this._state = 'CONNECTED';
      console.log("Connected");
    },
    
    _onWebSocketMessage: function (event) {
      var message = JSON.parse(event.data);
      
      if (message && message.type) {
        this.element.trigger(message.type, message.data); 
      }
    },
    
    _onWebSocketClose: function (event) {
      console.log("Socket closed");
      this._reconnect();
    },
    
    _onWebSocketError: function (event) {
      console.log("Socket error");
      this._reconnect();
    },
    
    _onPlacesNear: function (event, data) {
      var places = data.places;
      
      var newPlaces = _.filter(places, $.proxy(function (place) {
        return _.indexOf(this._knownPlaceIds, place.id) === -1;
      }, this));
      
      this._knownPlaceIds = this._knownPlaceIds.concat(_.pluck(newPlaces, "id"));
      
      $(document).trigger("discoveredPlaces", {
        places: newPlaces
      });
    },
    
    _onMapLocationChange: function (event, data) {
      this._sendMessage('player:screen-move', {
        topLeft: data.topLeft,
        bottomRight: data.bottomRight
      });
    },
    
    _onGeoLocationChange: function (event, data) {
      if (this._state === 'WAITING_LOCATION') {
        this._createSession(data.latitude, data.longitude, function (err, data) {
          if (err) {
            console.error(err);
          } else {
            this._connect(data.sessionId);
          }
        }.bind(this));
      } else {
        this._sendMessage('player:move', {
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    }
  });
  
  $(document).ready(function () {
    $('#map').map();
    $(document.body).client({
      userId: '1ef96285-6f3b-472d-bd5a-873f02167625'
    });
  });
  
}).call(this);