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
	, request = require('request')
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

function youtube_parser(url) {
    url = url.replace("player_embedded&v=", "watch?v=");
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);

    if (match && match[7].length == 11) {

        return match[7];
    } else {
        //alert("Url incorrecta");
        return 0;
    }
}

function vimeo_parser(url) {
    url = url.replace("https://","http://");
    url = url.replace("channels/staffpicks/","");
    var regExp = /http:\/\/(www\.)?vimeo.com\/(\d+)($|\/)/;
    var match = url.match(regExp);
    if (match) {
        //console.log(match[2]);
        return (match[2]);
    } else {
        //console.log(0);
        return 0;
    };
}

function isTargetedContentType(url){
	
	var isIt = false;

	if(url.indexOf("youtube.com") > -1) isIt = true;
	else if(url.indexOf("vimeo.com") > -1) isIt = true;

	return isIt;

}

function trimURL(url){

	// url = url.split('&')[0];

	// if(url.indexOf("vimeo.com") > -1) url = url.split('?')[0];

	return url;
}

Index.prototype.twitterSearchName = function( req, res ) {
	console.log('twitterSearchName');
	var shorts = [], longs = [], shortFunctions = [];
	
	var name = req.params.name;

	var params = {screen_name: name, count: 100};
	twitter.get('statuses/user_timeline', params, function(error, tweets, response) {
	// var params = {q: query, count: 100};
	// twitter.get('search/tweets', params, function(error, tweets, response) {
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

							var resultURL = response.request.href;

							if( isTargetedContentType(resultURL) != 0 ){
								expandedUrlArr.push( trimURL(resultURL) );	
							}
							
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