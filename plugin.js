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
    const workerId = uuid();

    setInterval(() => {
      pidusage.stat(process.pid, (err, stat) => {
        shadyMessages.trigger("cluster:ping", {
          workerId: workerId,
          cpu: stat.cpu,
          memory: stat.memory,
          port: options.getOption('port'),
          host: options.getOption('host')
        });
      });
    }, 1000);
    
    register(null, {
      "shady-worker": workerId
    });
  };
  
})();