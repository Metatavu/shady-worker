/* jshint esversion: 6 */
/* global __dirname */
(() => {
  'use strict';

  const _ = require('lodash');
  const util = require('util');
  const uuid = require('uuid4');
  const pidusage = require('pidusage');
  
  module.exports = function setup(options, imports, register) {
    const shadyMessages = imports['shady-messages'];
    const logger = imports['logger'];
    
    register(null, {
      "shady-worker": {
        "start": (serverGroup, port, host) => {
          const workerId = uuid();
          const workerPort = port || options['port'];
          const workerHost = host || options['host'];
          const workerServerGroup = serverGroup || 'default';
          
          logger.info(util.format("Shady worker %s started", workerId));
          logger.info(util.format("Listening internal address: %s:%s", workerHost, workerPort));
          logger.info(util.format("Using server group: %s", workerServerGroup));
          
          setInterval(() => {
            pidusage.stat(process.pid, (err, stat) => {
              shadyMessages.trigger("cluster:ping", {
                'workerId': workerId,
                'cpu': stat.cpu,
                'memory': stat.memory,
                'port': workerPort,
                'host': workerHost,
                'server-group': workerServerGroup
              });
            });
          }, 1000);
 
          return workerId;
        }
      }
    });
  };
  
})();