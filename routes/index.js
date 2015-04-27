"use strict";
var async = require("async")
	, util = require('util')
	, fs = require('fs')
	, Twitter = require('twitter')
	, twitter = new Twitter({
		consumer_key: 'bErHMR6PDzxriWdBtBSArIo5z',
		consumer_secret: '1GpZ1eR2rE0wTYRrhhH6gKgxxI6OiPIHLxfhrRI18FyrNe3KXB',
		access_token_key: '181426642-H6cberOhj15qa8sPD0N9NGi4EGcUquD52qAWULvg',
		access_token_secret: '6hIvoqOSc8sohe73sA5UxA14r6dAIc9AbDDUwRDPAlca2'
	  })
	, unshortener = require('unshortener')
	, bitlyAuth = {bitly: {username: 'robertdalesmith', apikey: 'R_711700dc0d6040618824dc4acd405b39'}}
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

	var params = {screen_name: 'robertdalesmith', count: 50, result_type: 'video'};
	twitter.get('statuses/user_timeline', params, function(error, tweets, response){
		if (!error) {
			
			// console.log(tweets);

			async.auto([
				function(next){

					tweets.forEach(function(tweet){

						// console.log(tweet.entities.urls);
						if(tweet.entities.urls.length >= 1){
							for(var i=0; i<tweet.entities.urls.length; i++){
								shorts.push(tweet.entities.urls[i].expanded_url);
							}
						}

					});

					next();

				},
				function(next){

					shorts.forEach(function(url, i){

						shortFunctions.push(function(cont){

							unshortener.expand(shorts[longs.length]+'', bitlyAuth, function (err, url){
								console.log(url.href);
								longs.push(url.href);
								cont();
							});

						});

					});

					next();

				}
			], 
			function(){

				async.series(shortFunctions, function(){

					res.send(shorts);

				});				
				
			});

		}
	});

	
};