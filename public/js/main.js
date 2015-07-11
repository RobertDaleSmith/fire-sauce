var ua = navigator.userAgent.toLowerCase();
var isAndroid = ua.indexOf("android") > -1;

// Page and resources have loaded.
$(window).bind("load", function() {
	
	// Twitter username search input validation.
	$('input#search_input').bind('keydown', function(e) {
		// Only prevent valid characters
		if((e.keyCode >= 48 && e.keyCode <=90) || (e.keyCode >= 96 && e.keyCode <= 105) || (e.keyCode == 189)){
			// Allow alt, ctrl, and command combinations
			if(!(e.altKey || e.ctrlKey || e.metaKey)){
				// Make sure no text is selected
				if((this.selectionStart == this.selectionEnd)){
					// Check length to prevent futher input
					if(this.value.length == 15) e.preventDefault();
				}else if(e.keyCode == 189 && !e.shiftKey){
					e.preventDefault();
				}
			}
		}
		if(e.keyCode == 13){ // Enter key fires submit.
			$('div#search_button').click();
		}
	});

	$('input#search_input').bind('paste', function(e) {
		e.preventDefault();
		var clipboardData = e.originalEvent.clipboardData.getData('text/plain');

		//remove invalid chars
		var r = /[^a-z0-9_]/gi,	v = clipboardData;
		if(r.test(v)) clipboardData = v.replace(r, '');
		
		if(this.selectionStart == this.selectionEnd){ 
			if(this.value.length != 15) 
				insertAtCaret('search_input', clipboardData);
		}else{
			var c = this.selectionStart;
			var d = (this.selectionEnd - this.selectionStart) + (15 - this.value.length);
			var s = clipboardData.substring(0, d);
			var t = this.value;
				t = t.slice(0, this.selectionStart) + t.slice(this.selectionEnd);
			this.value = t;
			this.setSelectionRange(c, c);
			insertAtCaret('search_input', s);
		}
	});

	$('input#search_input').bind('input', function(e) {
		var c = this.selectionStart,
			r = /[^a-z0-9_]/gi,
			v = $(this).val();
		if(r.test(v)) {
			$(this).val(v.replace(r, ''));
			c--;
		}
		if(this.value.length > 15) this.value = this.value.slice(0,-1);
		if(!isAndroid)this.setSelectionRange(c, c);

	});

	// Twitter username submission to render feed.
	$('div#search_button').bind('click', function(e) {
		var query = $('input#search_input').val();
		if(query.length > 0){
			console.log("fire: " + query);
			ga('send', 'event', 'search', 'screen_name', query);
			watchUsername(query);
			hideFailedAlert();
		}		
	});

	$('input#cancel_search_button').bind('click', function(e) {
		hideSearchSpinner();
		if(searchRequest) searchRequest.abort();
	});

	$('input#close_failed_button').bind('click', function(e) {

		hideFailedAlert();
	});

	$('#player_watermark').bind('click', function(e) {
		
		// if($(this).hasClass('live')) $(this).removeClass('live');
		// else $(this).addClass('live');
		if(trackIndex>0){
			hist.channels[hist.watching].trackList[trackIndex].write('skipped', true);
			playNextTrack();
		}

	});
	
	$( "#timeSlider" ).slider({
		animate: "fast",
		orientation: "horizontal",
		range: "min",
		min: 0,
		max: 100,
		value: 0,
		start: function(){

			timeSeeking = true;

		},
		slide: function(){
			var seconds = $("#timeSlider").slider("value");
			
			// seekVideoTo(seconds, false);

		},
		stop: function(){
			var seconds = $("#timeSlider").slider("value");

			seekVideoTo(seconds, true);

			setTimeout(function(){timeSeeking = false;}, 100);

		},
		change: function(){

			// console.log( $( "#timeSlider" ).slider("value") );

		}
	});

    $('#channel_info_wrapper .click_area, #channel_info_wrapper .follow_btn').bind('click', function(e) {
		var parent = $(this).parent();

		if(!parent.hasClass('default')){
			if(parent.hasClass('followed')) {
				parent.removeClass('followed');
				$("#channel__"+hist.watching).removeClass('followed');
				$("#channel__"+hist.watching+" .follow").val("FOLLOW");
				hist.channels[hist.watching].write('followed', false);

			} else {
				parent.addClass('followed');
				$("#channel__"+hist.watching).addClass('followed');
				$("#channel__"+hist.watching+" .follow").val("FOLLOWED");
				hist.channels[hist.watching].write('followed', true);
			}
		}
		

	});

	$('#titlebar_wrapper .btn').bind('click', function(e) {
		
		var isFor = $(this).attr('for');

		if(!$(this).hasClass('active')){
		
			$('#titlebar_wrapper .btn').removeClass('active');
			$(this).addClass('active');

			$('#chrome_wrapper .panel').css('display','none');
			$('#chrome_wrapper .panel#'+isFor).css('display','');

			if(isFor=="channels_wrapper"){
				renderChannels(hist.channels);
			}else if(isFor=="watch_wrapper"){
				scrollToTrack();
			}

		} else {
			if(isFor=="watch_wrapper"){
				scrollToTrack();
			}
		}

	});

	$('#toggle_sidebar_btn').bind('click', function(e) {
		if(!$('#main_wrapper').hasClass('side_open')){
			$('#main_wrapper').addClass('side_open');
		}else{
			$('#main_wrapper').removeClass('side_open');
		}

	});

	$('#twitter_signin_btn').bind('click', function(e) {
		// $('#splash_wrapper').css('display','none');
		$('#titlebar_wrapper .btn.watching').click();
	});

	$('#twitter_signout_btn').bind('click', function(e) {
		// $('#splash_wrapper').css('display','');
		// location.hash = "";
		pauseVideo();
	});

    // Check hash and load it.
    var hash = location.hash || "";
    hash = hash.replace('#/','').replace('#','');

    //Cleanup screen_name further
	var r = /[^a-z0-9_]/gi,	v = hash;
	if(r.test(v)) hash = v.replace(r, '');
	hash = hash.toLowerCase();
    
    if(hash.length>0){
    	watchUsername(hash);
    	// $('#splash_wrapper').css('display','none');
    }

    loadPopularSuggestions();

    fadeSplash();


});


function fadeSplash(){
	setTimeout(function(){
		$('#splash_wrapper .logo .iris').removeClass('spinning');
		$('#splash_wrapper').addClass('done');
		setTimeout(function(){
			$('#splash_wrapper').css('display','none');
		},500);
	},500);
};

var isPortrait = null;
window.onresize = function onResizeEvent(event) {
	var  isNowPortrait = null;
	if ( window.innerHeight > window.innerWidth ) 
		 isNowPortrait = true;
	else isNowPortrait = false;
	if ( isNowPortrait != isPortrait ) updateTweetOverLayWidth();
	isPortrait = isNowPortrait;
}

var suggestCache = {};
function loadPopularSuggestions(){
	if(getPopRequest) getPopRequest.abort();
	getPopRequest = $.getJSON('/popular',function(res){ 

		for(var i=0; i<res.length; i++){ 
			// console.log(res[i].name);
			var name = res[i].name;
			suggestCache[name] = res[i];
			suggestCache[name].suggested = true;
		}
	});
}

var spinnerTimer;

function showSearchSpinner() {
	$('#searching_wrapper').addClass('searching');
	$('#channel_info_wrapper .spinner').addClass('rotating');
}
function hideSearchSpinner() {
	$('#searching_wrapper').removeClass('searching');
	window.clearTimeout(spinnerTimer);
	spinnerTimer = setTimeout(function(){
		$('#channel_info_wrapper .spinner').removeClass('rotating');
	},1000);
}

var alertTimer;

function showFailedAlert(msg) {
	$('#failed_wrapper').addClass('failed');
	$('#failed_message').text(msg);
	window.clearTimeout(alertTimer);
	alertTimer = setTimeout(function(){	hideFailedAlert();	}, 5000);
}
function hideFailedAlert() {
	$('#failed_wrapper').removeClass('failed');
}

var searchRequest, getUserRequest, getPopRequest;

function watchUsername(screen_name){

	screen_name = screen_name.toLowerCase();

	showSearchSpinner();

	var sinceID = null;

	if(hist.channels[screen_name]){
		if(hist.channels[screen_name].trackList.length > 0){

			console.log('Previously watched.. Pulling only since last id.');
			//Get last id.
			var listLength = hist.channels[screen_name].trackList.length;
			sinceID = hist.channels[screen_name].trackList[listLength-1].id;

			tracksLoaded = 0;
			$("#schedule_wrapper").html('');
			renderTweets(hist.channels[screen_name].trackList);

			
			hist.write('watching', screen_name.toLowerCase());

			getTwitterUserInfo(screen_name, updateChannelInfo);
		}
	}

	if(searchRequest) searchRequest.abort();

	var reqUrl = "/channel/tracks/?screen_name="+screen_name;

	if(sinceID) reqUrl = reqUrl + "&since_id="+sinceID;

	searchRequest = $.getJSON(reqUrl, function( channelData ) {
		
		if(!channelData.error && channelData.trackList){
			var tweets = channelData.trackList || [];
		
			// console.log(channelData);

			hideSearchSpinner();

			hideFailedAlert();

			if(tweets.length > 0){

				ga('send', 'event', 'watch', 'screen_name', screen_name);

				
				hist.write('watching', screen_name.toLowerCase());
				
				if(!sinceID){
					tracksLoaded = 0;
					$("#schedule_wrapper").html('');
					hist.channels.write(hist.watching, {'trackList':[]});
					
				}else{
				}

				if(channelData.info) hist.channels[hist.watching].write('info', channelData.info);
				getTwitterUserInfo(screen_name, updateChannelInfo);

				for(var i=0; i<tweets.length; i++){ hist.channels[hist.watching].trackList.push(tweets[i]); }

				renderTweets(tweets);
							
				// Play most recent.
				trackIndex = tweets.length;
				// playNextTrack();
				playMostRecentUnfinished();
				

			} else {
				console.log('No new vids found...');
				showFailedAlert("No new videos found.");

				if(sinceID){

					if(hist.channels[hist.watching].trackIndex>=0){
						trackIndex = hist.channels[hist.watching].trackIndex;
						playTrack(trackIndex);
					}else{
						trackIndex = tweets.length;
						// playNextTrack();
						playMostRecentUnfinished();
					}
					
				}

			}

			if(!$('.btn.watching').hasClass('active'))$('.btn.watching').click();
		}else {
			// hideFailedAlert();
			hideSearchSpinner();
			showFailedAlert("Channel not found.");
			console.log("Channel not found.");
		}

	}).fail(function(jqXHR, textStatus, errorThrown){

		hideSearchSpinner();
		showFailedAlert("Server may be down. :( ");
		console.log(textStatus + ": " + errorThrown);

	});

}

function updateChannelInfo(user){
	// console.log(user);
	if(hist.channels[hist.watching])if(hist.channels[hist.watching].followed)$('#channel_info_wrapper').addClass('followed');
	else $('#channel_info_wrapper').removeClass('followed');
	$('#channel_info_wrapper').removeClass('default');
	$('#channel_info_wrapper').css('display','');
	$('#channel_info_wrapper .avatar').attr('src',user.profile_image_url.replace('http:',''));
	$('#channel_info_wrapper .profile_link').attr('href',"https://twitter.com/intent/user?screen_name="+user.screen_name);
	$('#channel_info_wrapper .name').text(user.name);
	$('#channel_info_wrapper .screen_name').text('@'+user.screen_name);

	$('input#search_input').val(user.screen_name);

	updateTweetOverLayWidth();

	var screen_name = user.screen_name.toLowerCase();
	$('#channels_wrapper .channel').removeClass('active');
	$('#channel__'+screen_name).addClass('active');
	$('#channel__'+screen_name+' .avatar').attr('src',user.profile_image_url.replace('http:',''));
	$('#channel__'+screen_name+' .name').text(user.name);
	$('#channel__'+screen_name+' .screen_name').text('@'+user.screen_name);

	location.hash = "/"+user.screen_name;
}

function updateTweetOverLayWidth(){

	var offset = 40 + parseInt( $('#channel_info_wrapper').css('width').replace('px','') ) + parseInt( $('#channel_info_wrapper').css('left').replace('px','') );
	$('#track_tweet_wrapper').css('max-width', 'calc(100% - '+ offset +'px)');

}

function renderTweets(tweets){

	// var tweetElements = [];
	$.each( tweets, function( idx, tweet ) {

		var element = $('<li/>')
			.addClass("track")
			.attr('id', "video__"+tracksLoaded)
			.append($('<div/>')
				.addClass("indicator")
			)
			.append($('<div/>')
				.addClass("progress")
			)
			.append($('<a/>')
				.addClass("started")
				// .attr('title', moment( new Date(tweet.created_at)).format('llll') )
				.attr('href','http://twitter.com/'+tweet.user.screen_name+'/status/'+tweet.id)
				.attr('target','_blank')
				.append($('<span/>')
					.addClass("fromNow")
					.text( moment( new Date(tweet.created_at)).fromNow() )
				)
				.append($('<span/>')
					.addClass("exactDate")
					.text( moment( new Date(tweet.created_at)).format('llll') )
				)
			)
			.append($('<div/>')
				.addClass("text")
				.html(twemoji.parse(tweet.text.linkify_tweet()))
			)
			.append($('<div/>')
				.addClass("controls")
				.append($('<div/>')
					.addClass("btn pause")
					.html("<i class='fa fa-pause'></i>")
					.attr('title','Pause')
				)
				.append($('<div/>')
					.addClass("btn start")
					.html("<i class='fa fa-play'></i>")
					.attr('title','Start')
				)
				.append($('<a>')
					.addClass("btn right fav")
					.html("<i class='fa fa-star'></i>")
					.attr('title','Diamond in the rough')
					.attr('href','https://twitter.com/intent/favorite?tweet_id='+tweet.id+'&related=firesaucetv')
				)
				.append($('<a>')
					.addClass("btn right resauce")
					.html("<i class='fa fa-retweet'></i>")
					.attr('title','Resauce to your stream')
					.attr('href','https://twitter.com/intent/retweet?tweet_id='+tweet.id+'&related=firesaucetv')
				).append($('<a>')
					.addClass("btn right reply")
					.html("<i class='fa fa-reply'></i>")
					.attr('title','Say something about it')
					.attr('href','https://twitter.com/intent/tweet?in-reply-to='+tweet.id+
									'&related=firesaucetv%3AFire%20Sauce.TV&url='+tweet.url.replace('https://','http://').replace('http://www.youtube.com/watch?v=','http://youtu.be/')+
									'&via='+tweet.user+
									'&hashtags=firesaucetv'
									
									)
				)
			)
		;
		element.find('.btn.start').bind('click', videoStartClickEvent);
		element.find('.btn.pause').bind('click', videoPauseClickEvent);
		element.find('.btn.fav').bind('click', videoFavClickEvent);
		element.find('.btn.resauce').bind('click', videoResauceClickEvent);
		
		if(tweet.percent>=0) {
			element.find('div.progress').attr('style', "width: " + tweet.percent + "%");
		}
		if(tweet.retweeted) element.find('a.resauce').addClass('resauced');
		if(tweet.favorited) element.find('a.fav').addClass('diamond');
		if(tweet.watched) element.addClass('watched');
		if(tweet.skipped) element.addClass('skipped');
		if(tweet.error) {
			element.addClass('error');
			element.find('.text .errMsg').remove();
			element.find('.text').append($('<span/>').addClass("errMsg").html("Embedded video unable to play."));
		}

		$("#schedule_wrapper").append(element);
		tracksLoaded++;
		
		// if(idx == tweets.length-1){ }
	});
	
	scrollToTrack();

}

var trackIndex = -1;
var tracksLoaded = 0;

var hist = Rhaboo.persistent("fire-sauce");
if(!hist.channels) hist.write('channels', {});
if(!hist.watching) hist.write('watching', '');

// This code loads the IFrame Player API code asynchronously.
var ytScriptTag = document.createElement('script');
	ytScriptTag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(ytScriptTag, firstScriptTag);

// This function creates an <iframe> (and YouTube player) after the API code downloads.
var ytplayer, ytplayerReady, ytIframeAPIReady, playerState = 0;
function onYouTubeIframeAPIReady() {
	ytplayerReady = true;
	// loadVideo("");
	setInterval(updatePlayerInfo, 1000);
}

function initYouTubeIframeAPI(videoId, startTime) {
	// console.log(startTime);
	if(ytplayerReady){
		ytIframeAPIReady = true;
		ytplayer = new YT.Player('ytplayer', {
			height:'100%',
			width: '100%',
			videoId: videoId,
			playerVars : {
				start: parseInt(startTime),
				cc_load_policy: 0,
				controls : 1,
				enablejsapi: 1,
				disablekb: 1,
				html5: 1,
				iv_load_policy: 3,
				modestbranding: 1,
				origin: window.location.host,
				playsinline: 1,
				rel: 0,
				theme: 'dark',
				showinfo: 1
			},
			events: {
				'onReady': onYtPlayerReady,			
				'onError': onYtPlayerError,
				'onStateChange': onYtPlayerStateChange
			}
		});
	}
}

function onYtPlayerReady(event) {
	event.target.playVideo();
	// toggleMute();
}

function onYtPlayerStateChange(event) {
	playerState = event.data;
	if (event.data == YT.PlayerState.ENDED) {
		console.log("ENDED");
		hist.channels[hist.watching].trackList[trackIndex].write('watched', true);
		hist.channels[hist.watching].trackList[trackIndex].write('skipped', null);
		hist.channels[hist.watching].trackList[trackIndex].write('percent', 100);

		$('li.track#video__'+trackIndex).css('width','').addClass('watched')
										.find('div.progress').attr('style', "");
		
		$.post('/channel/tracks?screen_name='+hist.watching);
		playNextTrack();	
	}
	else if (event.data == YT.PlayerState.PLAYING) {
		console.log("PLAYING");
		hist.channels[hist.watching].trackList[trackIndex].write('started', true);
		hist.channels[hist.watching].trackList[trackIndex].write('skipped', null);
		hist.channels[hist.watching].write('trackIndex', trackIndex);
		hist.channels[hist.watching].write('lastWatched', (new Date()).toString());

		if(hist.channels[hist.watching].trackList[trackIndex].error){
			hist.channels[hist.watching].trackList[trackIndex].erase('error');
			$('li.track#video__'+trackIndex).removeClass('error');
			$('li.track#video__'+trackIndex+' .text .errMsg').remove();
		}
		
		//Sets timeSlider max to the number of seconds in current video.
		$( "#timeSlider" ).slider('option', 'max', ytplayer.getDuration() );

		//Sets pause button to show play icon.
		$('li.track.playing div.btn.pause i.fa').removeClass('fa-play').addClass('fa-pause');
		$('li.track.playing div.btn.pause').attr('title','Pause');
	}
	else if (event.data == YT.PlayerState.PAUSED) {
		console.log("PAUSED");

		//Sets pause button to show pause icon.
		$('li.track.playing div.btn.pause i.fa').removeClass('fa-pause').addClass('fa-play');
		$('li.track.playing div.btn.pause').attr('title','Play');
	}
	else if (event.data == YT.PlayerState.BUFFERING) {
		console.log("BUFFERING");
		setTimeout(function(){
			playVideo();
		},1000);

	}
	else if (event.data == YT.PlayerState.CUED) {
		console.log("CUED");

	}
}

var errorCodes = {
	150 : "This video is unavailable. Possible embedding disabled.",
	2 : "This video ID is invalid."
}

function onYtPlayerError(event) {
	console.log("Error: " + event.data);

	if(event.data == 150 || event.data == 2) hist.channels[hist.watching].trackList[trackIndex].write('error', event.data);

	$('li.track#video__'+trackIndex).addClass('error');
	$('li.track#video__'+trackIndex+' .text .errMsg').remove();
	$('li.track#video__'+trackIndex+' .text').append($('<span/>').addClass("errMsg").html("Embedded video unable to play."));

	playNextTrack();
}

function seekVideoTo(seconds, allowSeekAhead) {
	ytplayer.seekTo(seconds, allowSeekAhead);
	//allowSeekAhead = false when dragging.
	//allowSeekAhead = true when user releases drag.
}

function playVideo() {
	ytplayer.playVideo();
}

function pauseVideo() {
	ytplayer.pauseVideo();
}

function stopVideo() {
	ytplayer.stopVideo();
	ytplayer.clearVideo();
}

function loadVideo(videoId, startTime) {
	if(!startTime) startTime = 0;
	playerState = 0;
	if(!ytIframeAPIReady) initYouTubeIframeAPI(videoId, startTime);
	else ytplayer.loadVideoById(videoId, startTime, "large");
}

function setVolume(volPercent){
	if(volPercent > 100)  volPercent = 100;
	else if(volPercent < 0) volPercent = 0;
	ytplayer.setVolume(volPercent);
}

function getVolume(volPercent){
	return ytplayer.getVolume();
}

function toggleMute(videoId) {
	if(ytplayer.isMuted()) {
		ytplayer.unMute();
	} else {
		ytplayer.mute();
	}
}

function getYouTubeID(url){
	var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
	var match = url.match(regExp);
	if (match&&match[7].length==11){
		return match[7];
	}else{
		return "";
	}
}

function getVimeoID(url) {
	var match = /vimeo.*\/(\d+)/i.exec( url );
	if ( match ) { return match[1]; }
}

function playNextTrack(){

	trackIndex--;
	playerState = 0;
	playTrack(trackIndex);
	// playMostRecentUnfinished();

}

function playMostRecentUnfinished(){
	
	var listLength = hist.channels[hist.watching].trackList.length;
	for(var idx = listLength-1; idx >= 0; idx--){
		if( !hist.channels[hist.watching].trackList[idx].watched &&
		   (!hist.channels[hist.watching].trackList[idx].skipped || idx <= trackIndex ) &&
			!hist.channels[hist.watching].trackList[idx].error ){
			playTrack(idx);
			break;
		} else if(idx==0) playMostRecentSkipped();
	}

}

var loopEnabled = true;

function playMostRecentSkipped(){

	var listLength = hist.channels[hist.watching].trackList.length;
	for(var idx = listLength-1; idx >= 0; idx--){
		if( !hist.channels[hist.watching].trackList[idx].watched &&
			 hist.channels[hist.watching].trackList[idx].skipped &&
			!hist.channels[hist.watching].trackList[idx].error ){
			playTrack(idx);
			break;
		} else if(idx==0) {
			// played all current results
			if(loopEnabled) playTrack(trackIndex);
			// check for some new content
		}
	}

}

function playTrack(index){
	// console.log(index); console.log(hist.watching);

	try{
		var videoID = getYouTubeID(hist.channels[hist.watching].trackList[index].url);
		var percent = hist.channels[hist.watching].trackList[index].percent || 0;
		var startTime = hist.channels[hist.watching].trackList[index].time || 0;
		if( percent >= 100 ) startTime = 0;

		ga('send', 'event', 'video', 'play', videoID);
		ga('send', 'event', 'video', 'view', hist.watching);

		trackIndex = index;

		if(index>=0) {
			console.log("Starting next track... " + index + " : " + hist.channels[hist.watching].trackList[index].url);
			loadVideo(videoID, startTime);
		}
		$('li.track').removeClass('playing');
		$('li.track#video__'+index).addClass('playing');

		// var thisOffsetTop = 0;
		// try{ thisOffsetTop = $("#video__"+index).offset().top; }catch(e){}
		// var elementFromTop = $("#schedule_wrapper").scrollTop() + thisOffsetTop - 116;
		// $("#schedule_wrapper").animate({scrollTop:elementFromTop},500);
		scrollToTrack();

		//Clears out any others in playing state.
		$('.track .controls .btn.start .fa').removeClass('fa-repeat').addClass('fa-play');
		$('.track .controls .btn.start').attr('title','Start');
		$('.track .controls .btn.start').removeClass('restart');

		//Sets this one to playing state.
		$('#video__' + index + ' .btn.start .fa').removeClass('fa-play').addClass('fa-repeat');
		$('#video__' + index + ' .btn.start').attr('title','Restart');
		$('#video__' + index + ' .btn.start').addClass('restart');

		//Show tweet in overlay.
		$('#track_tweet_wrapper span.text').html(hist.channels[hist.watching].trackList[index].text.linkify_tweet());
	}catch(e){
		console.log('error caught for playTrack('+index+')');
	}
}

function scrollToTrack(){
	if( $("#schedule_wrapper .playing") ){
		if( $("#schedule_wrapper .playing").offset() ){
			var topOffset = $('#watch_wrapper').offset().top;
			$("#schedule_wrapper").animate({scrollTop:$("#schedule_wrapper").scrollTop() + $("#schedule_wrapper .playing").offset().top-topOffset},500);
		}
	}
}

function videoStartClickEvent(e){
	
	if($(this).hasClass('restart')){
		seekVideoTo(0);
		playVideo();
	}else{
		var index = parseInt( $(this).parent().parent().attr('id').replace('video__','') );

		if(trackIndex>=0) hist.channels[hist.watching].trackList[trackIndex].write('skipped', true);

		playTrack(index);	
	}
	
}

function videoPauseClickEvent(e){
	if( playerState == 1 ){
		pauseVideo();
		
	} else {
		playVideo();
		$('li.track.playing div.btn.pause i.fa').removeClass('fa-play').addClass('fa-pause');
	}
}

function videoFavClickEvent(e){

	var index = $(this).parent().parent().attr('id');
		index = index.replace('video__','');
		index = parseInt(index);

	if($(this).hasClass('diamond')){
		$(this).removeClass('diamond');

		hist.channels[hist.watching].trackList[index].write('favorited', false);
	}else{
		$(this).addClass('diamond');

		hist.channels[hist.watching].trackList[index].write('favorited', true);
	}

}

function videoResauceClickEvent(e){

	var index = $(this).parent().parent().attr('id');
		index = index.replace('video__','');
		index = parseInt(index);

	if($(this).hasClass('resauced')){
		$(this).removeClass('resauced');

		hist.channels[hist.watching].trackList[index].write('retweeted', false);
	}else{
		$(this).addClass('resauced');

		hist.channels[hist.watching].trackList[index].write('retweeted', true);
	}

}

function getTwitterUserInfo(screen_name, cb){

	// console.log(hist.watching);
	if(hist.channels[hist.watching]){
		if(hist.channels[hist.watching].info 
		// && !(Date.parse(new Date()) - Date.parse(hist.channels[hist.watching].info.updated) < (5 * 60 * 1000))
		){
			cb(hist.channels[hist.watching].info);
			return hist.channels[hist.watching].info;
		}
	}
	
	if(getUserRequest) getUserRequest.abort();
	var reqUrl = "/channel/?screen_name="+screen_name;
	getUserRequest = $.getJSON(reqUrl, function(user){ 
		console.log('Fetched Twitter user\'s data');
		if(user) hist.channels[hist.watching].write('info', user);
		if(cb)cb(user);
	});

}

var markerWidth = 0, 
	prevCurrentTime = 0, 
	prevDuration = 0, 
	currentTime = 0,
	tempCurrentTime = 0, 
	tempDuration = 0, 
	durationTimeOutput = 0, 
	currentTimeOutput = 0,
	seekBarWidth, 
	fractionLoaded, 
	timeSeeking = false, 
	volSeeking = false,
	completedPercent = 0;

// Display information about the current state of the player
function updatePlayerInfo() {
  
    if(ytplayer){
        
        if(playerState == 1) {

			fractionLoaded = ytplayer.getVideoLoadedFraction();
			tempCurrentTime = ytplayer.getCurrentTime();
			tempDuration = ytplayer.getDuration();
			// seekBarWidth = document.getElementById("timeSlider").clientWidth;

        	completedPercent = ((tempCurrentTime*100)/tempDuration).toFixed(2);
        	$('li.track#video__'+trackIndex+' .progress').css("width",completedPercent+"%");

    		if(hist.channels[hist.watching].trackList[trackIndex]){
    			hist.channels[hist.watching].trackList[trackIndex].write('percent', completedPercent);
    			hist.channels[hist.watching].trackList[trackIndex].write('time', tempCurrentTime);
    		}

            //update seeker
            if (!timeSeeking) {
            	$("#timeSlider").slider("value", tempCurrentTime);

                currentTimeOutput = secondsToTime(tempCurrentTime);
                document.getElementById("timer_current").innerHTML = currentTimeOutput;

                // $("#fractionLoaded").css("width", (fractionLoaded*seekBarWidth) +"px");
            }

            durationTimeOutput = secondsToTime(tempDuration);
            document.getElementById("timer_duration").innerHTML = durationTimeOutput;

            prevCurrentTime = tempCurrentTime;
            prevDuration = tempDuration;

        }
        // else if(playerState == 0) {
        //     videoEnded();
        // }

    }

}

function renderChannels(channels){

	$("#suggested_wrapper").html('').css('display','');
	$("#followed_wrapper").html('').css('display','');
	$("#history_wrapper").html('').css('display','');

	var suggestCount = 0, followedCount = 0, watchedCount = 0;
	var suggested = JSON.parse(JSON.stringify(suggestCache));
	var sortable = [];
	for (var channel in channels) {
		channels[channel].name = channel;
		if(channel != "_rhaboo")sortable.push(channels[channel]);

		delete suggested[channel];
	}
	for (var track in suggested) {
		sortable.unshift(suggested[track]);
	}

	sortable.sort(function(a,b) { return (new Date(a.lastWatched)) - (new Date(b.lastWatched)) } );

	$.each( sortable, function( idx, channel ) {
		// console.log(channel);

		if(!channel.trackList) channel.trackList = [];

		var element = $('<li/>')
			.addClass("channel")
			.attr('id', "channel__"+channel.name)
			.attr('channel', channel.name)
			.append($('<div/>')
				.addClass("status")
			)
			.append($('<div/>')
				.addClass("options")
				.append($('<div/>')
					.addClass("btn delete")
					.html('<i class="fa fa-remove"></i>')
				)
			)
			.append($('<div/>')
				.addClass("info")
				.append($('<img>')
					.addClass("avatar")
					.attr('src', channel.info.profile_image_url.replace('http:',''))
				)		
				.append($('<div/>')
					.addClass("name")
					.html(channel.info.name)
				)
				.append($('<div/>')
					.addClass("screen_name")
					.html('@'+channel.info.screen_name)
				)
				.append($('<div/>')
					.addClass("views")
					.html('&nbsp;'+getWatchedCount(channel.trackList)+' / '+channel.trackList.length+'&nbsp;')
				)
			)
			.append($('<input>')
				.addClass("follow")
				.attr('type','button')
				.val("FOLLOW")
			)
			
		;
		element.find('div.info').bind('click', function(){ 
			var channel = $(this).parent().attr('channel');
			watchUsername(channel);
		});
		element.find('div.info').bind('contextmenu', function(e){ 
			if(!$(this).parent().hasClass('suggested')){
				e.preventDefault();
				$(this).parent().toggleClass('edit');
			}
		});
		element.find('div.info').bind('swiperight', function(e){ 
			if(!$(this).parent().hasClass('suggested')){
				e.preventDefault();
				console.log('swiperight');
				$(this).parent().addClass('edit');
			}			
		});
		element.find('div.info').bind('swipeleft', function(e){ 
			if(!$(this).parent().hasClass('suggested')){
				e.preventDefault();
				console.log('swipeleft');
				$(this).parent().removeClass('edit');
			}
		});
		element.find('div.btn.delete').bind('click', function(){ 
			var channel = $(this).parent().parent().attr('channel');
			console.log('delete '+ channel);

			hist.channels.erase(channel);

			$(this).parent().parent().remove();
		});
		element.find('input.follow').bind('click', function(){ 
			var channel = $(this).parent().attr('channel');

			// console.log(hist.watching+"=="+channel);
			if(!$(this).parent().hasClass("followed")){
				$(this).parent().addClass("followed");
				$(this).val("FOLLOWED");

				hist.channels[channel].write('followed', true);

				if(hist.watching==channel)$("#channel_info_wrapper").addClass("followed");
			}else{
				$(this).parent().removeClass("followed");
				$(this).val("FOLLOW");
			
				hist.channels[channel].write('followed', false);

				if(hist.watching==channel)$("#channel_info_wrapper").removeClass("followed");
			}
		});
		if(channel.followed){
			element.addClass("followed");
			element.find('input.follow').val("FOLLOWED");
		}
		if(channel.suggested){
			element.addClass("suggested");
		}
		// if(channel.info) element.html('@'+channel.info.screen_name);
		if(channel.name == hist.watching) element.addClass('active');

		if(channel.suggested) {
			$("#suggested_wrapper").prepend(element);
			suggestCount++;
		}
		else if(channel.followed) {
			$("#followed_wrapper").prepend(element);
			followedCount++;
		}
		else {
			$("#history_wrapper").prepend(element);
			watchedCount++;
		}
		
	});

	if(suggestCount<1)$("#suggested_wrapper").css('display','none');
	if(followedCount<1)$("#followed_wrapper").css('display','none');
	if(watchedCount<1)$("#history_wrapper").css('display','none');

}

function getWatchedCount(tracks){
	var count = 0;
	for (var idx in tracks) {
		count += tracks[idx].watched ? 1 : 0;
	}
    return count;
}