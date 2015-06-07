/**
 * Module depedencies
 */

var Path = require('path');
var util = require('util');
var _ = require('lodash');
var transformTools = require('browserify-transform-tools');


module.exports = transformTools.makeStringTransform('machinepack', {}, function (code, transformOptions, done) {
  if(!transformOptions.config) {
    return done(new Error('Could not find `machinepack` object in package.json file.'));
  }

  var filePath = transformOptions.file;
  var packPath = transformOptions.configData.configDir;
  var packMetadata = transformOptions.config;

  var isTopLevelPackIndex = _.endsWith(filePath, Path.join(packPath, 'index.js'));

  // If this is not the `index.js` file of a machinepack, leave
  // the code alone.
  if (!isTopLevelPackIndex) {
    return done(null, code);
  }

  // If this is a machinepack, replace the index.js file with
  // a browserify-compatible version of the code that does not use
  // Machine.pack() (because browserify doesn't know how to handle
  // dynamic requires).
  var shimCode = _.reduce(packMetadata.machines, function (memo, machineIdentity){
    var line = util.format('module.exports[Machine.getMethodName(\'%s\')] = Machine.build( require(\'%s\') );\n', machineIdentity, './'+Path.join(packMetadata.machineDir,machineIdentity));
    memo += line;
    return memo;
  },
  '// This shim was generated during browserification of this machinepack.\n'+
  '// Because Machine.pack() uses dynamic require() calls, which is not supported \n'+
  '// natively by browserify, the boilerplate index.js file in this pack was automatically\n'+
  '// replaced with explicit requires of each machine herein.\n'+
  'var Machine = require(\'machine\');\n'+
  '\n'+
  'module.exports = {};\n');
  shimCode += '\n';
  // console.log('\n------\n',shimCode,'\n\n');

  return done(null, shimCode);
});
