/* jshint esversion: 6 */
/* global __dirname */
(() => {
  'use strict';

  const _ = require('lodash');
  const util = require('util');
  const uuid = require('uuid4');
  const pidusage = require('pidusage');
  const architect = require('architect');
  const options = require(__dirname + '/options');
  const shadyMessages = require('shady-messages').getInstance();
  
  if (!options.isOk()) {
    options.printUsage();
    process.exitCode = 1;
    return;
  }
  
  const architectConfig = architect.loadConfig(__dirname + '/config.js');
  
  architect.createApp(architectConfig, (err, app) => {
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
  });

})();