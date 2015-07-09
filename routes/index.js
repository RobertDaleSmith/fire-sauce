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

	var ChannelsMongo = require("../libs/ChannelsMongo").ChannelsMongo;
	self._channels = new ChannelsMongo( {mongo:mongo} );

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
    }

}

function isTargetedContentType(url){

	var isIt = false;

	if(url)if(url.indexOf("youtube.com") > -1) isIt = true;
	else if(url)if(url.indexOf("youtu.be") > -1) isIt = true;
	// else if(url.indexOf("vimeo.com") > -1) isIt = true;

	if(url)if(url.indexOf("mQ00zwkK9Og") > -1) isIt = false;

	return isIt;

}

function trimYouTubeURL(url){

	var base = url.split('?')[0],
		params = getParamsArray(url);
	
	if( base.indexOf("youtube.com/embed/") > -1 ) {
		params.v = base.split("/embed/")[1];
		base = "http://www.youtube.com/watch";
	}

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

Index.prototype.incTracksPlayed = function( req, res ) {

	var self = this;
	var name = req.query.screen_name || ""; name = name.toLowerCase();

	self._channels.incTracksPlayedCount(name, function( err, result ){});
	console.log("+1 added to "+ name + "'s tracksPlayedCount.");

};

Index.prototype.getChannelInfo = function( req, res ) {

	var self = this;
	var name = req.query.screen_name || ""; name = name.toLowerCase();

	self._channels.findOneChannel(name, function( err, channel ){
		res.send(channel.info);
	});

};

Index.prototype.getChannel = function( req, res ) {

	var self = this;
	var name = req.query.screen_name || "";
	var since = req.query.since_id;
	var channelData = { name: name, info: { screen_name: name }, trackList: [], trackSince: null }, 
		errorObj = {error:true}, isNewUser = false, newTracks = [];

	//Cleanup screen_name first
	var r = /[^a-z0-9_]/gi,	v = name;
	if(r.test(v)) name = v.replace(r, '');
	name = name.toLowerCase();

	async.series([
		function(next){
			//Get channel data from our DB.
			self._channels.findOneChannel(name, function( err, result ){
				if(result)channelData=result;
				else isNewUser = true;
				next();
			});
		},
		function(next){
			//Has this channel been created on FireSauce before?
			if(Date.parse(new Date()) - Date.parse(channelData.info.updated) < (5 * 60 * 1000)){
				// Info was found and is up to date, skip fetching user info from Twitter API.
				next();
			} else {
				// New FireSauce channel or prevous is due for an update.
				console.log('getting twitter user info');
				twitter.get('users/show', {screen_name: name}, function(error, user, response) {

					if(!error){
						channelData.info = {
							screen_name: 				  user.screen_name,
							name: 						  user.name,
							id: 						  user.id,
							id_str: 					  user.id_str,
							description: 				  user.description,
							location: 					  user.location,
							profile_background_color: 	  user.profile_background_color,
							profile_background_image_url: user.profile_background_image_url,
							profile_background_tile: 	  user.profile_background_tile,
							profile_image_url: 			  user.profile_image_url,
							profile_link_color: 		  user.profile_link_color,
							updated: 					  new Date()
						};
						//Update channels info object in db..
						self._channels.updateInfo(channelData.name, channelData.info, function( err, result ){
							console.log(channelData.name + "'s info has been updated.");
						});
					} else {
						//TODO: Error or Twitter user doesn't exist.
						errorObj = error;
					}

					next();

				});
			}
		},
		function(next){
			
			var sinceTweetId;

			if(channelData){

				if(channelData.trackSince) sinceTweetId = channelData.trackSince;
				
				getUsersTweets(channelData.name, sinceTweetId, function(tracks, lastId){
					
					if(tracks)if(tracks.length > 0) newTracks = tracks;

					if(lastId) channelData.trackSince = lastId;
					
					next();

				});

			} else {

				next();

			}

		},
		function(next){
			
			if(newTracks.length>0){

				if(isNewUser){ //Add user with tracks.

					channelData.trackList = newTracks;
					channelData.counts = {
						tunedInTotal: 1, tracksPlayedToday: 0,
						tunedInToday: 1, tracksPlayedTotal: 0
					};
					
					self._channels.addChannel(channelData, function( err, result ){
						console.log(channelData.name + " is a new FireSauce.TV channel. :)");
					});

				} else { //Just update this users tracks.

					if(newTracks) for(var i=0; i<newTracks.length; i++){ channelData.trackList.push(newTracks[i]); }

					self._channels.addTracks(channelData.name, newTracks, channelData.trackSince, function( err, result ){
						console.log(channelData.name + " has " + newTracks.length + " new tracks. YAY! :)");
					});
					
				}

			}

			if(!isNewUser){
				self._channels.incTunedInCount(channelData.name, function( err, result ){
					console.log("+1 added to "+ channelData.name + "'s tunedInCount.");
				});
			}

			next();

		},
		function(next){
			if(since){

				var sinceIndex = 0;
				for(var i=0; i<channelData.trackList.length; i++){
					if(channelData.trackList[i].id == since) {
						sinceIndex = i+1;
						break;
					}
				}

				channelData.trackList.splice(0, sinceIndex);

			}
			next();
		}
	],
	function(){

		if( !isNewUser || (isNewUser && channelData.trackList.length > 0)) 
			 res.send(channelData);
		else res.send(errorObj);

	});

};

Index.prototype.twitterSearchName = function( req, res ) {
	// console.log('twitterSearchName');
	var user = req.query.screen_name,
		since = req.query.sinceID;
	console.log("Fetching user: " + user);

	getUsersTweets(user, since, function(tracks){
		if(tracks) res.send(tracks);
		else res.send([]);
	});

};

function getUsersTweets(user, since, cb){

	var lastCheckedId;
	var params = {screen_name: user, count: 200, since_id: since, include_rts: true};
	twitter.get('statuses/user_timeline', params, function(error, tweets, response) {

		if (!error) {
			// console.log(tweets);
			if(tweets)if(tweets.length>0)lastCheckedId = tweets[0].id_str;


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

					// console.log(tweetLinks.length);
					var cnt = 0;

					// will do 20 at a time
					async.eachLimit(tweetLinks, 20, function(tweet, next) {
						var thisCnt = 0;
						
						// console.log(tweet.url);

						//Skip request check
						if(	tweet.url.includes('youtube.com/watch')		||
							tweet.url.includes('youtu.be')   	  		){

							console.log(tweet.url);

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
												// console.log(ytUrl);
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
						// console.log('done filtering urls');
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
					// res.send(err);
					cb(null);
				}

				console.log('returning results');
				// res.send();
				cb(results.expandUrls, lastCheckedId);
			});

		} else {
			// console.log('BOOM!');
			//TODO: handle the error dude.
			cb(null);
		}

	});

};

Index.prototype.leaderboard = function( req, res ) {

	var self = this;

	self._channels.getLeaderboardChannels(function( err, channels ){

		res.render( 'index/leaderboard', {
			channels: channels
		});

	});

};

Index.prototype.popular = function( req, res ) {

	var self = this;

	self._channels.getPopChannels(function( err, channels ){
		res.send(channels);
	});

};