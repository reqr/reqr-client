#!/usr/bin/env node
require("../common/strings");

var debug = require("debug")("reqr:client"),
		_ = require("underscore"),
		path = require("path"),
    client = require("./client-helpers")
		helpers = require("../common/helpers");

var yargs = require("yargs")
    .usage("Consumes cucumber scenarios and junit results files and submits them to the reqr service.\nUsage: $0")
    .example("$0")
    .example("$0 -f feature_path -r results_path")
    .alias("f", "features")
    .describe("f", "Specify the cucumber path, can either be a directory or a file")
    .alias("r", "results")
    .describe("r", "Specify the path to the test results folder, a directory is expected with one or many junit xml files")
    .alias("b", "basepath")
    .describe("b", "Specify the a base path to use for relative file paths")
    .alias("w", "working")
    .describe("w", "Specify a working path - this is where the client packages up test data before sending to the reqr service. Defaults to .reqr-client in the current folder")
    .alias("u", "username")
    .describe("u", "Specify a username to connect to the reqr service")
    .alias("p", "password")
    .describe("p", "Specify a password to connect to the reqr service")
    // .alias("rf", "results-file")
    // .describe("rf", "Specify an individual junit xml result file")
    .alias("s", "server")
    .describe("s", "Specify a server to connect to the reqr service")
    .default('s', "http://es-dev.flyvictor.com:8080/")
    .alias("h", "help")
    .describe("h", "Print help message")

var argv = yargs.argv

if (argv.help) {
	console.log(yargs.help());
	return;
}

var base = argv.basepath || argv.features; //|| __dirname;

if (!base.endsWith("/")) {
	base += "/";
}

if (!argv.features.endsWith("/")) {
  argv.features += "/";
}

if (!argv.results.endsWith("/")) {
	argv.results += "/";
}

var working = argv.w || path.resolve() + "/.reqr-client";

console.log("Executing analysis features %s, results %s, base path %s, working folder %s", argv.features, argv.results, base, working);

console.log("Reqr auth", argv.u, argv.p, argv.s);

var manifest = {
	started : new Date(),
	completed : null,
	features : argv.features,
	testResults : argv.results,
	basePath : base,
	workingFolder : working
};

client.createEmptyDir(working);
client.createEmptyDir(working + "/src");
client.createEmptyDir(working + "/src/cucumber");

client.copyFeatureFiles(base, argv.features, working + "/src/cucumber")
	.then(client.copyRecursiveSync(argv.results, working + "/src/test-results/"))
  //TODO - add the metadata file
	.then(_.partial(client.tarGzip, working + "/src", working + "/out.tar.gz"))
  .then(_.partial(client.send,
    argv.s, argv.u, argv.p, working + "/out.tar.gz"))
  // .then(_.partial(client.send, "https://localhost:1338/file-upload", __dirname + "/test.txt"))
  .catch(function(er) {
    console.log("Error during upload", er);
  })
  .done(function() {
    console.log("Done")
  })
  