"use strict";
var async = require("async")
	, util = require('util')
	, fs = require('fs')
	, Twitter = require('twitter')
	, twitter = new Twitter({
		consumer_key: '***REMOVED***',
		consumer_secret: '***REMOVED***',
		access_token_key: '***REMOVED***',
		access_token_secret: '***REMOVED***'
	  })
	, unshortener = require('unshortener')
	, bitlyAuth = {bitly: {username: ***REMOVED***, apikey: '***REMOVED***'}}
	;

var Index = function( mongo ) {
	var self = this;
	if( typeof mongo === 'undefined' ) { console.log( 'Index( undefined )!'); }
};

exports.initIndex = function( mongo ){
	return new Index( mongo );
};

Index.prototype.home = function( req, res ) {
	console.log('home');
	res.render( 'index/home', {
		pageId: 'home',
		subId:  '',
		title:  'Home'
	});
};


Index.prototype.twitterSearchName = function( req, res ) {
	console.log('twitterSearchName');
	var shorts = [], longs = [], shortFunctions = [];

	var params = {screen_name: ***REMOVED***, count: 50, result_type: 'video'};
	twitter.get('statuses/user_timeline', params, function(error, tweets, response) {
		if (!error) {

			// console.log(tweets);
			async.auto({
				getUrls: function(done) {
					var tempArr = tweets.reduce(function(arr, tweet) {
						if (tweet.entities.urls.length >= 1) {
							for (var i = 0; i < tweet.entities.urls.length; i++) {
								arr.push(tweet.entities.urls[i].expanded_url);
							}
						}
						return arr;
					}, []);

					return done(null, tempArr);
				},
				expandUrls: ['getUrls', function(done, results) {
					var shortUrlArr = results.getUrls;
					var expandedUrlArr = [];

					// will do 20 at a time
					async.eachLimit(shortUrlArr, 20, function(url, next) {
						request({
							method: "HEAD",
							url: url,
							followAllRedirects: true
						}, function(error, response) {
							if (error) {
								// not sure how to handle a bad url...continue for now
								return next();
							}
							expandedUrlArr.push(response.request.href);
							next();
						});
					}, function(err) {
						if (err) {
							return done(err);
						}
						return done(null, expandedUrlArr)
					});

				}]
			}, function(err, results) {
				if (err) {
					res.send(err);
				}
				res.send(results.expandUrls);
			});

		}
	});

};