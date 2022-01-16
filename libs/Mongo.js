var mongoDB = require('mongodb').Db;
var mongoServer = require('mongodb').Server;
var ReplSet = require('mongodb').ReplSet;
var async = require('async');
var util = require('util');
var { MongoClient } = require('mongodb');
var config = require('config');

var dbConfig = config.get('dbConfig');

// Connection URL
var uri = process.env.DB_PATH || 'mongodb://localhost:27017/fire-sauce';

var Mongo = exports.Mongo = function( dbInfo ) {
	if (typeof(dbInfo) !== 'undefined') {
		this._dbInfo = dbInfo;
	}
}

Mongo.prototype.getDB = function() {
	return this._db;
}

Mongo.prototype._loadCollection = function(collectionName, callback) {
	var self = this;
	self._db.collection(collectionName, function (err, collection) {
		self._collections[collectionName] = collection;
		callback(err);
	})
}

/* The callback will take two params, an error or null, and the database object*/
Mongo.prototype.connect = function(callback) {
	var self = this;
	MongoClient.connect(uri, (err, client)=>{
		if(err) {
			console.log(err);
			callback(err);
			return;
		}

		console.log('Connected successfully to server');
		self._db = client.db(self._dbInfo.name);
		self._collections = {};

		if (typeof(self._db) === 'undefined') {
			callback(Error("No DB Info provided"));
			return;
		}

		if (err === null) {
			self._db.authenticate(self._dbInfo.username, self._dbInfo.password, function(err, status) {
				if (self._dbInfo.collections) {
					var collections = self._dbInfo.collections;
					async.forEach(collections, function(collectionName, next){
						console.log(collectionName + " collection is loading..");
						self._loadCollection( collectionName, function(){
							console.log(collectionName + " collection is loaded!");
							console.log(next);
						});
						next();
					}, function(){
						console.log("All collections loaded.");
						callback();
					});
				} else {
					callback(err, status);
				}
			})
		} else {
			callback(err, false);
		}
	});
}

Mongo.prototype.getCollection = function(collectionName) {
	if (this._collections[collectionName]) {
		return this._collections[collectionName];
	}
	throw new Error(collectionName + " not loaded in Mongo");
}