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
	// else if(url.indexOf("vimeo.com") > -1) isIt = true;

	return isIt;

}

function trimYouTubeURL(url){

	var base = url.split('?')[0],
	  params = getParamsArray(url);
	
	url = base + '?v=' + params.v;
	if(params.t) url += '&t=' + params.t;

	// if(url.indexOf("vimeo.com") > -1) url = url.split('?')[0];

	return url;
}

function getParamsArray(url){
	
	var params = url.split('?')[1];
	if(params) params = params.split('&');
	else params = [];

	var jsonStr = '{';

	for(var i=0; i<params.length; i++){

		var param = params[i].split('=');

		jsonStr += '"' + param[0] + '":"' + param[1] + '"';

		if(i<params.length-1) jsonStr += ',';

	}

	jsonStr+='}';

	return JSON.parse( jsonStr );

}

Index.prototype.twitterSearchName = function( req, res ) {
	// console.log('twitterSearchName');
	var shorts = [], longs = [], shortFunctions = [];

	var query = req.params.query;
	console.log("Fetching user: " + query);

	var params = {screen_name: query, count: 200}; 
	twitter.get('statuses/user_timeline', params, function(error, tweets, response) {
	// var params = {q: query, count: 100};
	// twitter.get('search/tweets', params, function(error, tweets, response) {
		if (!error) {

			// console.log(tweets);
			async.auto({
				getTweetLinks: function(done) {
					var tempArr = tweets.reduce(function(arr, tweet) {
						if (tweet.entities.urls.length >= 1) {
							for (var i = 0; i < tweet.entities.urls.length; i++) {
								arr.push({
									id: tweet.id_str,
									text: tweet.text,
									created_at: tweet.created_at,
									url: tweet.entities.urls[i].expanded_url,
									user: tweet.user,
									retweet_count: tweet.retweet_count,
									favorite_count: tweet.favorite_count,
									favorited: tweet.favorited,
									retweeted: tweet.retweeted,
									source: tweet.source,
									lang: tweet.lang
								});
							}
						}
						return arr;
					}, []);

					return done(null, tempArr);
				},
				expandUrls: ['getTweetLinks', function(done, results) {
					var tweetLinks = results.getTweetLinks;
					var expandedTweetUrlArr = [];

					// will do 20 at a time
					async.eachLimit(tweetLinks, 20, function(tweet, next) {
						request({
							method: "HEAD",
							url: tweet.url,
							followAllRedirects: true
						}, function(error, response) {
							if (error) {
								// not sure how to handle a bad url...continue for now
								return next();
							}

							var resultLongUrl = response.request.href;

							if( isTargetedContentType(resultLongUrl) != 0 ){
								tweet.url = trimYouTubeURL(resultLongUrl);
								expandedTweetUrlArr.push(tweet);
							}

							next();
						});
					}, function(err) {
						if (err) {
							return done(err);
						}

						//Sort by date created_at before returning results.
						expandedTweetUrlArr.sort(function(a,b) { return (new Date(a.created_at)) - (new Date(b.created_at)) } )

						return done(null, expandedTweetUrlArr)
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
