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
			$('input#search_button').click();
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
		this.setSelectionRange(c, c);
	});

	// Twitter username submission to render feed.
	$('input#search_button').bind('click', function(e) {
		var query = $('input#search_input').val();
		if(query.length > 0){
			console.log("fire: " + query);
			ga('send', 'event', 'search', 'screen_name', query);
			watchUsername(query);
			hideFailedAlert();
		}		
	});

	$('input#cancel_search_button').bind('click', function(e) {
		
		$('#searching_wrapper').removeClass('searching');
		if(searchRequest) searchRequest.abort();
	});

	$('input#close_failed_button').bind('click', function(e) {

		hideFailedAlert();
	});

	$('#player_watermark').bind('click', function(e) {
		
		if($(this).hasClass('live')) $(this).removeClass('live');
		else $(this).addClass('live');
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

    $('#channel_info_wrapper').bind('click', function(e) {
		
		if($(this).hasClass('followed')) {
			$(this).removeClass('followed');
			$("#channel__"+history.watching).removeClass('followed');
			$("#channel__"+history.watching+" .follow").val("FOLLOW");
			history.channels[history.watching].followed = false;
		} else {
			$(this).addClass('followed');
			$("#channel__"+history.watching).addClass('followed');
			$("#channel__"+history.watching+" .follow").val("FOLLOWED");
			history.channels[history.watching].followed = true;
		}

	});

	$('#titlebar_wrapper .btn').bind('click', function(e) {
		
		if(!$(this).hasClass('active')){

			var isFor = $(this).attr('for');
		
			$('#titlebar_wrapper .btn').removeClass('active');
			$(this).addClass('active');

			$('#chrome_wrapper .panel').css('display','none');
			$('#chrome_wrapper .panel#'+isFor).css('display','');

			if(isFor=="channels_wrapper"){
				renderChannels(history.channels);
			}else if(isFor=="watch_wrapper"){
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

    // Check hash and load it.
    var hash = location.hash || "";
    hash = hash.replace('#/','').replace('#','');
    if(hash.length>0){    	
    	watchUsername(hash);
    }

});

function showSearchSpinner() {
	$('#searching_wrapper').addClass('searching');
}
function hideSearchSpinner() {
	$('#searching_wrapper').removeClass('searching');
}

function showFailedAlert(msg) {
	$('#failed_wrapper').addClass('failed');
	$('#failed_message').text(msg);
	setTimeout(function(){	hideFailedAlert();	}, 5000);
}
function hideFailedAlert() {
	$('#failed_wrapper').removeClass('failed');
}

var searchRequest, getUserRequest;

function watchUsername(screen_name){

	

	screen_name = screen_name.toLowerCase();

	showSearchSpinner();

	var sinceID = null;

	if(history.channels[screen_name]){
		if(history.channels[screen_name].trackList.length > 0){

			console.log('Previously watched.. Pulling only since last id.');
			//Get last id.
			var listLength = history.channels[screen_name].trackList.length;
			sinceID = history.channels[screen_name].trackList[listLength-1].id;

			tracksLoaded = 0;
			$("#schedule_wrapper").html('');
			renderTweets(history.channels[screen_name].trackList);

			$('input#search_input').val(screen_name);
			history.watching = screen_name.toLowerCase();
			getTwitterUserInfo(screen_name, updateChannelInfo);
		}
	}

	if(searchRequest) searchRequest.abort();

	var reqUrl = "/search/?screen_name="+screen_name;

	if(sinceID) reqUrl = reqUrl + "&sinceID="+sinceID;

	searchRequest = $.getJSON(reqUrl, function( tweets ) {
		
		// console.log(tweets);

		hideSearchSpinner();

		hideFailedAlert();

		if(tweets.length > 0){

			ga('send', 'event', 'watch', 'screen_name', screen_name);

			$('input#search_input').val(screen_name);

			$('input#search_input').val(screen_name);
			history.watching = screen_name.toLowerCase();
			getTwitterUserInfo(screen_name, updateChannelInfo);
			
			if(!sinceID){
				tracksLoaded = 0;
				$("#schedule_wrapper").html('');
				history.channels[history.watching] = {'trackList':tweets};
			}else{
				history.channels[history.watching].trackList = history.channels[history.watching].trackList.concat(tweets);
			}

			renderTweets(tweets);
						
			// Play most recent.
			trackIndex = tweets.length;
			playNextTrack();
			

		} else {
			console.log('No compatible content found...');
			showFailedAlert("No new recent videos.");

			if(sinceID){

				if(history.channels[history.watching].trackIndex>=0){
					trackIndex = history.channels[history.watching].trackIndex;
					playTrack(trackIndex);
				}else{
					trackIndex = tweets.length;
					playNextTrack();	
				}
				
			}

		}

	}).fail(function(jqXHR, textStatus, errorThrown){

		console.log(textStatus + ": " + errorThrown);

	});

}

function updateChannelInfo(user){
	// console.log(user);
	if(history.channels[history.watching].followed)$('#channel_info_wrapper').addClass('followed');
	else $('#channel_info_wrapper').removeClass('followed');
	$('#channel_info_wrapper').css('display','');
	$('#channel_info_wrapper .avatar').attr('src',user.profile_image_url);
	$('#channel_info_wrapper .name').text(user.name);
	$('#channel_info_wrapper .screen_name').text('@'+user.screen_name);

	location.hash = "/"+user.screen_name;
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
				.append($('<div/>')
					.addClass("btn right fav")
					.html("<i class='fa fa-diamond'></i>")
					.attr('title','Diamond in the rough')
				)
				.append($('<div/>')
					.addClass("btn right resauce")
					.html("<i class='fa fa-retweet'></i>")
					.attr('title','Resauce to your stream')
				)
			)
		;
		element.find('.btn.start').bind('click', videoStartClickEvent);
		element.find('.btn.pause').bind('click', videoPauseClickEvent);
		element.find('.btn.fav').bind('click', videoFavClickEvent);
		
		if(tweet.percent>=0) {
			element.find('div.progress').attr('style', "width: " + tweet.percent + "%");
		}
		if(tweet.favorited) element.find('div.fav').addClass('diamond');
		if(tweet.watched) element.addClass('watched');
		if(tweet.skipped) element.addClass('skipped');
		if(tweet.error) element.addClass('error');

		$("#schedule_wrapper").append(element);
		tracksLoaded++;
		
		if(idx == tweets.length-1){

		}
	});
	
	scrollToTrack();

}

var history = { key: '', channels: null, watching: '' };
	history.key = 'history';
	history.channels = {};
var trackIndex = -1;
var tracksLoaded = 0;

var store = new Lawnchair({name:'firesauce', adapter:'dom'}, function(store) {
	// var me = {key:'a',firstName:'Clark',lastName:'Kent'};
	// store.save(me);
	store.get('history', function(obj) {
		if(obj) history.channels = obj.channels;
	});
});

// This code loads the IFrame Player API code asynchronously.
var ytScriptTag = document.createElement('script');
	ytScriptTag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(ytScriptTag, firstScriptTag);

// This function creates an <iframe> (and YouTube player) after the API code downloads.
var ytplayer, ytplayerReady, ytIframeAPIReady, playerState = 0;
function onYouTubeIframeAPIReady() {
	ytplayerReady = true;
	// loadVideo("L-6LXhFNeGw");
	setInterval(updatePlayerInfo, 100);
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
				theme: 'light',
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
		history.channels[history.watching].trackList[trackIndex].watched = true;
		history.channels[history.watching].trackList[trackIndex].skipped = null;
		history.channels[history.watching].trackList[trackIndex].percent = 100;
		$('li.track#video__'+trackIndex).css('width','').addClass('watched')
										.find('div.progress').attr('style', "");
		playNextTrack();	
	}
	else if (event.data == YT.PlayerState.PLAYING) {
		console.log("PLAYING");
		history.channels[history.watching].trackList[trackIndex].started = true;
		history.channels[history.watching].trackList[trackIndex].skipped = null;
		history.channels[history.watching].trackIndex = trackIndex;
		history.channels[history.watching].lastWatched = (new Date()).toString();

		if(history.channels[history.watching].trackList[trackIndex].error){
			history.channels[history.watching].trackList[trackIndex].error = null;
			$('li.track#video__'+trackIndex).removeClass('error');
		}
		
		
		store.save(history);

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
	console.log("Error: " + event);
	console.dir(event.data);

	if(event.data == 150 || event.data == 2) history.channels[history.watching].trackList[trackIndex].error = event.data;
	$('li.track#video__'+trackIndex).addClass('error');

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
	// playTrack(trackIndex);
	playMostRecentUnfinished();

}

function playMostRecentUnfinished(){
	
	var listLength = history.channels[history.watching].trackList.length;
	for(var idx = listLength-1; idx >= 0; idx--){
		if( !history.channels[history.watching].trackList[idx].watched &&
		   (!history.channels[history.watching].trackList[idx].skipped || idx <= trackIndex ) &&
			!history.channels[history.watching].trackList[idx].error ){
			playTrack(idx);
			break;
		} else if(idx==0) playMostRecentSkipped();
	}

}

var loopEnabled = true;

function playMostRecentSkipped(){
	
	var listLength = history.channels[history.watching].trackList.length;
	for(var idx = listLength-1; idx >= 0; idx--){
		if( !history.channels[history.watching].trackList[idx].watched &&
			 history.channels[history.watching].trackList[idx].skipped &&
			!history.channels[history.watching].trackList[idx].error ){
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
	// console.log(index); console.log(history.watching);

	try{
		var videoID = getYouTubeID(history.channels[history.watching].trackList[index].url);
		var percent = history.channels[history.watching].trackList[index].percent || 0;
		var startTime = history.channels[history.watching].trackList[index].time || 0;
		if( percent >= 100 ) startTime = 0;

		ga('send', 'event', 'video', 'play', videoID);
		ga('send', 'event', 'video', 'view', history.watching);

		trackIndex = index;

		if(index>=0) {
			console.log("Starting next track... " + index + " : " + history.channels[history.watching].trackList[index].url);
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
		$('#track_tweet_wrapper').html(history.channels[history.watching].trackList[index].text.linkify_tweet());
	}catch(e){
		console.log('error caught for playTrack('+index+')');
	}
}

function scrollToTrack(){
	if( $("#schedule_wrapper .playing") ){
		if( $("#schedule_wrapper .playing").offset() ){
			$("#schedule_wrapper").animate({scrollTop:$("#schedule_wrapper").scrollTop() + $("#schedule_wrapper .playing").offset().top-116},500);
		}
	}
}

function videoStartClickEvent(e){
	
	if($(this).hasClass('restart')){
		seekVideoTo(0);
		playVideo();
	}else{
		var index = parseInt( $(this).parent().parent().attr('id').replace('video__','') );
		if(trackIndex>=0) history.channels[history.watching].trackList[trackIndex].skipped = true;
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
		history.channels[history.watching].trackList[index].favorited = false;
	}else{
		$(this).addClass('diamond');
		history.channels[history.watching].trackList[index].favorited = true;
	}

}

function getTwitterUserInfo(screen_name, cb){

	console.log(history.watching);
	if(history.channels[history.watching]){
		if(history.channels[history.watching].info) {
			cb(history.channels[history.watching].info);
			return history.channels[history.watching].info;
		}
	}
	
	if(getUserRequest) getUserRequest.abort();
	var reqUrl = "/userInfo/?screen_name="+screen_name;
	getUserRequest = $.getJSON(reqUrl,function(user){ 
		console.log('Fetched Twitter user\'s data');
		if(user)history.channels[history.watching].info = user;
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

    		if(history.channels[history.watching].trackList[trackIndex]){
    			history.channels[history.watching].trackList[trackIndex].percent = completedPercent;
    			history.channels[history.watching].trackList[trackIndex].time = tempCurrentTime;
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

    store.save(history);

}

function renderChannels(channels){

	$("#followed_wrapper").html('');
	$("#history_wrapper").html('');

	var sortable = [];
	for (var channel in channels) {
		channels[channel].id = channel;
		sortable.push(channels[channel]);
	}
	sortable.sort(function(a,b) { return (new Date(a.lastWatched)) - (new Date(b.lastWatched)) } );

	$.each( sortable, function( idx, channel ) {
		// console.log(channel);

		var element = $('<li/>')
			.addClass("channel")
			.attr('id', "channel__"+channel.id)
			.attr('channel', channel.id)
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
					.attr('src', channel.info.profile_image_url)
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
			e.preventDefault();
			$(this).parent().toggleClass('edit');
		});
		element.find('div.btn.delete').bind('click', function(){ 
			var channel = $(this).parent().parent().attr('channel');
			console.log('delete '+ channel);

			delete history.channels[channel];
			$(this).parent().parent().remove();
		});
		element.find('input.follow').bind('click', function(){ 
			var channel = $(this).parent().attr('channel');

			console.log(history.watching+"=="+channel);
			if(!$(this).parent().hasClass("followed")){
				$(this).parent().addClass("followed");
				$(this).val("FOLLOWED");
				history.channels[channel].followed = true;
				if(history.watching==channel)$("#channel_info_wrapper").addClass("follow");
			}else{
				$(this).parent().removeClass("followed");
				$(this).val("FOLLOW");
				history.channels[channel].followed = false;
				if(history.watching==channel)$("#channel_info_wrapper").removeClass("follow");
			}
		});
		if(channel.followed){
			element.addClass("followed");
			element.find('input.follow').val("FOLLOWED");
		}
		// if(channel.info) element.html('@'+channel.info.screen_name);

		if(channel.followed) $("#followed_wrapper").prepend(element);
		else $("#history_wrapper").prepend(element);
		
	});

}

function getWatchedCount(tracks){
	var count = 0;
	for (var idx in tracks) {
		count += tracks[idx].watched ? 1 : 0;
	}
    return count;
}