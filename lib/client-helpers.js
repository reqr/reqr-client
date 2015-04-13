var fs = require("fs"),
    _ = require("underscore"),
    helpers = require("../common/helpers"),
    path = require("path"),
    when = require("when");

function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function mkdirRecursive(dirPath, mode, callback) {
  //Call the standard fs.mkdir
  fs.mkdir(dirPath, mode, function(error) {
    //When it fail in this way, do the custom steps
    if (error && error.errno === 34) {
      //Create all the parents recursively
      mkdirRecursive(path.dirname(dirPath), mode, callback);
      //And then the directory
      mkdirRecursive(dirPath, mode, callback);
    }
    //Manually run the callback since we used our own callback to do all these
    callback && callback(error);
  });
};

function createEmptyDir(path) {
  deleteFolderRecursive(path);
  fs.mkdirSync(path);
}

function copyFeatureFile(base, to, feature) {
  var fromPath = base + feature.relativePath;
  var toPath = to + "/" + feature.relativePath;

  // console.log("Copying %s to %s", fromPath,  toPath);
  var fse = require('fs-extra');

  fse.copySync(fromPath, toPath);
}

function copyRecursiveSync(src, dest) {
  var exists = fs.existsSync(src);
  var stats = exists && fs.statSync(src);
  var isDirectory = exists && stats.isDirectory();
  if (exists && isDirectory) {
    fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.linkSync(src, dest);
  }
};

function copyFeatureFiles(base, featurePath, to) {
  // console.log("copyFeatureFiles base : %s, featurePath : %s, to : %s", base, featurePath, to);
  var deferred = when.defer();

  //TODO : Need to refactor to prevent ENOENT errors
  helpers.getFeatureFiles(base, featurePath)
    .then(function(features) {
      console.log("%s features found", features.length);
      _.each(features, _.partial(copyFeatureFile, base, to));
      deferred.resolve();
    });

  return deferred.promise;

}

function tarGzip(folder, outFile) {
  var deferred = when.defer();

  var fstream = require('fstream'),
    tar = require('tar'),
    zlib = require('zlib');

  var writable = fs.createWriteStream(outFile);
  writable.on('finish', function() {
    console.error('all writes are now complete.');

    deferred.resolve();
  });

  /* Read the source directory */
  fstream.Reader({ 'path' : folder, 'type' : 'Directory' })
      .pipe(tar.Pack())/* Convert the directory to a .tar file */
      .pipe(zlib.Gzip())/* Compress the .tar file */
      .pipe(writable);

  return deferred.promise;
}

function send(server, user, pass, file) {
  
  var deferred = when.defer();

  console.log("Sending %s to %s", file, server);
  
  var formData = {
    reqr_upload: {
      value:  fs.createReadStream(file),
      options: {
        filename: "report",
        contentType: 'application/x-tar-gz'
      }
    }
  };

  require("request").post({
    url: server,
    formData: formData,
    auth: {
      user: user,
      pass: pass,
      sendImmediately: true
    }
  }, function optionalCallback(err, httpResponse, body) {
    console.log("optionalCallback");
    if (err) {
      console.error('upload failed:', err);
      deferred.reject(err);
    }
    else {
      console.log('Upload successful! Server responded with:', body);
      deferred.resolve();  
    }
    
  });

  return deferred.promise;
}

module.exports = {
  deleteFolderRecursive : deleteFolderRecursive,
  createEmptyDir : createEmptyDir,
  copyFeatureFiles : copyFeatureFiles,
  copyRecursiveSync : copyRecursiveSync,
  tarGzip : tarGzip,
  send : send
};