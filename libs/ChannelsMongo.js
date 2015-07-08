"use strict";
var ObjectID = require('mongodb').ObjectID;

/*
This object will take a db object.
It makes assumption that DB connection is established and authenticated.
*/
var ChannelsMongo = exports.ChannelsMongo = function(spec) {
	this.mongo = spec.mongo;
	this.channels = this.mongo.getCollection('channels');
}

var isEmpty = function (obj) {
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop)) return false;
	}
	return true;
}

ChannelsMongo.prototype.findChannels = function( queryIn, callback ){
	var self = this, query = {}, options = {};

	if( queryIn.options ){
		options = queryIn.options;
		delete queryIn.options;
	}

	if( queryIn && typeof queryIn === 'function' ){
		callback = queryIn;
	}
	else{
		query = queryIn; 
	}

	if( !options.sort ){
		options.sort = { '_id': 1 };
	}
	// console.log(options);
	self.channels.find( query, options, function( err, cursor ){

		if( err ) return callback( err );

		cursor.toArray( function( err, docs ){

			if( err ) return callback( err );

			return callback( err, docs );

		})
	});
}

ChannelsMongo.prototype.addChannel = function ( channel, callback ){

	channel.added = new Date();
	channel.updated = new Date();

	this.channels.insert( channel, function (error, channels) {
		// console.log(error);
		// console.log(channels);
		callback(error, channels);
	});

}

ChannelsMongo.prototype.findOneChannel = function ( channel, callback ){

	this.channels.findOne( {name: channel}, function (error, channel) {
		// console.log(error);
		// console.log(channel);
		callback(error, channel);
	});

}

ChannelsMongo.prototype.addTracks = function ( channel, newTracks, sinceId, callback ){

	this.channels.update(
	   { name: channel },
	   { $set: { "trackSince" : sinceId, "updated": new Date() } },
	   { $addToSet: { trackList: { $each: newTracks } } }
	);

}

ChannelsMongo.prototype.updateInfo = function ( channel, info, callback ){

	this.channels.update(
	   { name: channel },
	   { $set: { "info" : info } }
	);

}

ChannelsMongo.prototype.incTunedInCount = function ( channel, callback ){

	this.channels.update(
	   { name: channel },
	   { $inc: { "counts.tunedInTotal" : 1, "counts.tunedInToday" : 1 } }
	);

}

ChannelsMongo.prototype.incTracksPlayedCount = function ( channel, callback ){

	this.channels.update(
	   { name: channel },
	   { $inc: { "counts.tracksPlayedTotal" : 1, "counts.tracksPlayedToday" : 1 } }
	);

}
