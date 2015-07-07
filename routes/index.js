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
	, cheerio = require('cheerio')
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

	var prod = process.env.production;
	if(!prod)prod=false;

	res.render( 'index/home', {
		pageId: 'home',
		subId:  '',
		title:  '',
		production: prod
	});
};

if (!String.prototype.includes) {
  String.prototype.includes = function() {'use strict';
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}

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

	if(url)if(url.indexOf("youtube.com") > -1) isIt = true;
	else if(url)if(url.indexOf("youtu.be") > -1) isIt = true;
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

Index.prototype.twitterSearch = function( req, res ) {
	var query = req.params.query;

	console.log(query);

	var params = {q: query, count: 200}; 
	twitter.get('search/tweets', params, function(error, tweets, response) {

		console.log(tweets);
		res.send(tweets.statuses);

	});

	
};

Index.prototype.twitterGetUserInfo = function( req, res ) {
	// console.log('twitterSearchName');
	var shorts = [], longs = [], shortFunctions = [];
	var user = req.query.screen_name;
	console.log("Fetching user: " + user);

	twitter.get('users/show', {screen_name: user}, function(error, user, response) {

		if(!error){
			res.send({
				description: 				  user.description,
				following: 					  user.following,
				id: 						  user.id,
				id_str: 					  user.id_str,
				location: 					  user.location,
				name: 						  user.name,
				profile_background_color: 	  user.profile_background_color,
				profile_background_image_url: user.profile_background_image_url,
				profile_background_tile: 	  user.profile_background_tile,
				profile_image_url: 			  user.profile_image_url,
				profile_link_color: 		  user.profile_link_color,
				screen_name: 				  user.screen_name
			});
		} else {
			res.send({error:error});
		}

	});

};

Index.prototype.twitterSearchName = function( req, res ) {
	// console.log('twitterSearchName');
	var shorts = [], longs = [], shortFunctions = [];
	var user = req.query.screen_name,
		since = req.query.sinceID;
	console.log("Fetching user: " + user);

	var params = {screen_name: user, count: 200, since_id: since, include_rts: true}; 
	twitter.get('statuses/user_timeline', params, function(error, tweets, response) {

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
									user: tweet.user.screen_name,
									retweet_count: tweet.retweet_count,
									favorite_count: tweet.favorite_count,
									// favorited: tweet.favorited,
									// retweeted: tweet.retweeted,
									// source: tweet.source,
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

					console.log(tweetLinks.length);
					var cnt = 0;

					// will do 20 at a time
					async.eachLimit(tweetLinks, 20, function(tweet, next) {
						var thisCnt = 0;
						
						console.log(tweet.url);

						//Skip request check
						if(	tweet.url.includes('youtube.com/watch')		||
							tweet.url.includes('youtu.be')   	  		){

							console.log(isTargetedContentType(tweet.url));
							if( isTargetedContentType(tweet.url) != 0 ){
								tweet.url = trimYouTubeURL(tweet.url);
								expandedTweetUrlArr.push(tweet);
							}

							thisCnt = cnt++;
							// console.log(thisCnt + '\t' + 'skipped\t' + tweet.url);
							next();
						} else {

							request({
								method: "HEAD",
								url: tweet.url,
								followAllRedirects: true,
								maxRedirects: 5,
								timeout: 3000
							}, function(error, response, html) {
								if (error) {
									// not sure how to handle a bad url...continue for now
									thisCnt = cnt++;
									// console.log(thisCnt + '\terror getting long from short\t' + error);
									// console.log(thisCnt + '\t' + 'errored\t' + tweet.url);
									next();
								} else {
									var resultLongUrl = response.request.href;

									if( isTargetedContentType(resultLongUrl) != 0 ){
										tweet.url = trimYouTubeURL(resultLongUrl);
										expandedTweetUrlArr.push(tweet);
									}else{
										// console.log(resultLongUrl.includes('upworthy'));
										// if( resultLongUrl.includes('upworthy.com') || 
										// 	resultLongUrl.includes('buzzfeed.com') || 
										// 	resultLongUrl.includes('topdocumentaryfilms.com') ){
											//scrape html for iframe with youtube.com/embed in src.
											//then grab that iframe's id
											var $ = cheerio.load(html);
											var ytUrl = $('iframe[src*="//www.youtube.com/embed"]').attr('src');
											if( isTargetedContentType(ytUrl) != 0 ){
												console.log(ytUrl);
												tweet.url = trimYouTubeURL(ytUrl);
												expandedTweetUrlArr.push(tweet);
											}
										// }
									}
									thisCnt = cnt++;
									// console.log(thisCnt + '\t' + 'success\t' + resultLongUrl);
									next();
								}
							});

						}

					}, function(err) {
						console.log('done filtering urls');
						if (err) {
							console.log(err);
							return done(err);
						}

						//Sort by date created_at before returning results.
						expandedTweetUrlArr.sort(function(a,b) { return (new Date(a.created_at)) - (new Date(b.created_at)) } );

						console.log('done resorting urls \tresults: ' + expandedTweetUrlArr.length);

						return done(null, expandedTweetUrlArr)
					});

				}]
			}, function(err, results) {
				if (err) {
					res.send(err);
				}

				console.log('returning results');
				res.send(results.expandUrls);
			});

		} else {
			console.log('BOOM!');
			//TODO: handle the error dude.
		}

	});

};
