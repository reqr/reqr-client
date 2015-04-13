var _ = require("underscore"),
    when = require("when");

function getFeatureFiles(base, path) {

  // console.log("getFeatureFiles", base, path);
  var deferred = when.defer();
  var finder = require('findit')(path);
  var features = [];

  //This listens for files found
  finder.on('file', function (file) {
    if (file.endsWith(".feature")) {
      // console.log("Found file", file, file.substring(base.length));
      features.push({ filePath : file, relativePath : file.substring(base.length) });
      // console.log(features);
    }
  });

  finder.on('end', function (file) {
    deferred.resolve(features);
  });

  return deferred.promise;
}

module.exports = {
  getFeatureFiles : getFeatureFiles
};