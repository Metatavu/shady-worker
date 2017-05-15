const options = require(__dirname + '/options');
  
module.exports = [
  { 
    packagePath: "../live-delphi-shady-plugin",
    port: options.getOption('port'),
    host: options.getOption('host')
  }
];