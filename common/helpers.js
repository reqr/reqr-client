var _ = require("underscore"),
    when = require("when");

function getFeatureFiles(base, path) {

  // console.log("getFeatureFiles", base, path);
  var deferred = when.defer();
  var finder = require('findit')(path);
  var features = [];

  console.log("getFeatureFiles", base, path);

  //This listens for files found
  finder.on('file', function (file) {
    if (file.endsWith(".feature")) {

      //This was leading to a shortened path in the client:
      // var relative = file.substring(base.length);
      var relative = file.substring(base.length -1);

      console.log("Found file", file, relative);
      features.push({ filePath : file, relativePath : relative });
      // console.log(features);
    }
  });


  finder.on('end', function (file) {
    // console.log("getFeatureFiles features", features);
    deferred.resolve(features);
  });

  return deferred.promise;
}

module.exports = {
  getFeatureFiles : getFeatureFiles
};