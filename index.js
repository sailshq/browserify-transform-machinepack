/**
 * Module depedencies
 */

var Path = require('path');
var util = require('util');
var _ = require('lodash');
var through = require('through2');


/**
 * browserify-plugin-machinepack
 *
 * @param  {BrowserifyTask} b
 */
module.exports = function (b){
  // console.log('b:\n', b, false, null);
  console.log('basedir:\n', b._mdeps.basedir);
  // console.log('opts:\n',opts);
  var basedir = b._mdeps.basedir;

  var packMetadata;
  b.on('package', function (pkg){
    console.log('GOT PKG:',pkg);
    packMetadata = pkg.machinepack;
  });

  /**
   * @param  {String} filePath
   * @param  {Object} opts
   * @return {Stream2}
   */
  b.transform(function (filePath, opts){

    // console.log('transforming file "%s" with opts:',filePath,opts);

    // Use `through2` to build a nice little stream that will accumulate
    // the code for us.
    var code = '';
    var stream;
    stream = through.obj(function (buf, enc, next) {
        code += buf.toString('utf8');
        return next();
    }, function onCodeReady(next) {
        var isTopLevelPackIndex = _.endsWith(filePath, Path.join(basedir, 'index.js'));

        // If this is not the `index.js` file of a machinepack, leave
        // the code alone.
        if (!isTopLevelPackIndex) {
          this.push(new Buffer(code));
          return next();
        }

        // TODO:
        // Support other machinepacks required from inside the machines
        // of the top-level pack.

        // If this is a machinepack, replace the index.js file with
        // a browserify-compatible version of the code that does not use
        // Machine.pack() (because browserify doesn't know how to handle
        // dynamic requires).
        var shimCode = _.reduce(packMetadata.machines, function (memo, machineIdentity){
          var line = util.format('  \'%s\': Machine.build( require(\'%s\') ),\n', machineIdentity, './'+Path.join(packMetadata.machineDir,machineIdentity));
          memo += line;
          return memo;
        },
        '// This shim was generated during browserification of this machinepack.\n'+
        '// Because Machine.pack() uses dynamic require() calls, which is not supported \n'+
        '// natively by browserify, the boilerplate index.js file in this pack was automatically\n'+
        '// replaced with explicit requires of each machine herein.\n'+
        'var Machine = require(\'machine\');\n'+
        '\n'+
        'module.exports = {\n');
        shimCode += '};\n';
        // console.log('\n------\n',shimCode,'\n\n');

        this.push(new Buffer(shimCode));
        return next();
    });

    // Provide our new stream to browserify
    return stream;
  });
};
