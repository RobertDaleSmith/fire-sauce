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

    // Check hash and load it.
    var hash = location.hash || "";
    hash = hash.replace('#','');
    if(hash.length>0){
    	$('input#search_input').val(hash);
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

var searchRequest, currentChannel;

function watchUsername(screen_name){

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

			location.hash = screen_name;
			currentChannel = screen_name;

		}
	}

	if(searchRequest) searchRequest.abort();

	var reqUrl = "/search/?screen_name="+screen_name;

	if(sinceID) reqUrl = reqUrl + "&sinceID="+sinceID;

	searchRequest = $.getJSON(reqUrl , function( tweets ) {
		
		hideSearchSpinner();

		hideFailedAlert();

		if(tweets.length > 0){

			ga('send', 'event', 'watch', 'screen_name', screen_name);

			$('input#search_input').val(screen_name);

			location.hash = screen_name;
			currentChannel = screen_name;
			
			if(!sinceID){
				tracksLoaded = 0;
				$("#schedule_wrapper").html('');
				history.channels[currentChannel] = {'trackList':tweets};
			}else{
				history.channels[currentChannel].trackList = history.channels[currentChannel].trackList.concat(tweets);
			}

			renderTweets(tweets);
						
			// Play most recent.
			trackIndex = tweets.length;
			playNextTrack();
		} else {
			console.log('No compatible content found...');
			showFailedAlert("No new recent videos.");

			if(sinceID){
				playMostRecentUnplayed();
			}

		}

	});

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
				.text( moment(new Date(tweet.created_at)).fromNow() )
				.attr('href','http://twitter.com/'+tweet.user.screen_name+'/status/'+tweet.id)
				.attr('target','_blank')
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
					.html("<i class='fa fa-star-o'></i>")
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
		if(tweet.watched) element.addClass('watched');

		$("#schedule_wrapper").append(element);
		tracksLoaded++;
		
		if(idx == tweets.length-1){

		}
	});

	$("#schedule_wrapper").animate({scrollTop:$("#schedule_wrapper")[0].scrollHeight},500);

}

var history = { key: '', channels: null };
	history.key = 'history';
	history.channels = {};
var trackIndex = -1;
var tracksLoaded = 0;

var store = new Lawnchair({name:'firesauce'}, function(store) {
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
	setInterval(updatePlayerInfo, 500);
}

function initYouTubeIframeAPI(videoId, startTime) {
	console.log(startTime);
	if(ytplayerReady){
		ytIframeAPIReady = true;
		ytplayer = new YT.Player('ytplayer', {
			height:'100%',
			width: '100%',
			videoId: videoId,
			playerVars : {
				start: parseInt(startTime),
				cc_load_policy: 0,
				controls : 0,
				enablejsapi: 1,
				disablekb: 1,
				html5: 1,
				iv_load_policy: 3,
				modestbranding: 1,
				origin: window.location.host,
				playsinline: 1,
				rel: 0,
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
		history.channels[currentChannel].trackList[trackIndex].watched = true;
		history.channels[currentChannel].trackList[trackIndex].percent = 100;
		playNextTrack();		
	}
	else if (event.data == YT.PlayerState.PLAYING) {
		console.log("PLAYING");
		history.channels[currentChannel].trackList[trackIndex].started = true;
		
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

	if(event.data == 150 || event.data == 2) history.channels[currentChannel].trackList[trackIndex].error = event.data;
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
	
	$('li.track#video__'+trackIndex).css('width','').addClass('watched');

	trackIndex--;
	playerState = 0;
	// playTrack(trackIndex);
	playMostRecentUnplayed();

}

function playMostRecentUnplayed(){
	
	var listLength = history.channels[currentChannel].trackList.length;
	for(var idx = listLength-1; idx >= 0; idx--){
		if( !history.channels[currentChannel].trackList[idx].watched &&
			!history.channels[currentChannel].trackList[idx].error ){
			playTrack(idx);
			break;
		}
	}

}

function playTrack(index){
	// console.log(index); console.log(currentChannel);

	var videoID = getYouTubeID(history.channels[currentChannel].trackList[index].url);
	var percent = history.channels[currentChannel].trackList[index].percent || 0;
	var startTime = history.channels[currentChannel].trackList[index].time || 0;
	if( percent >= 100 ) startTime = 0;

	ga('send', 'event', 'video', 'play', videoID);
	ga('send', 'event', 'video', 'view', currentChannel);

	trackIndex = index;

	if(index>=0) {
		console.log("Starting next track... " + index + " : " + history.channels[currentChannel].trackList[index].url);
		loadVideo(videoID, startTime);
	}
	$('li.track').removeClass('playing');
	$('li.track#video__'+index).addClass('playing');

	var thisOffsetTop = 0;
	try{ thisOffsetTop = $("#video__"+index).offset().top; }catch(e){}

	var elementFromTop = $("#schedule_wrapper").scrollTop() + thisOffsetTop - 68;
	$("#schedule_wrapper").animate({scrollTop:elementFromTop},500);

	//Clears out any others in playing state.
	$('.track .controls .btn.start .fa').removeClass('fa-repeat').addClass('fa-play');
	$('.track .controls .btn.start').attr('title','Start');
	$('.track .controls .btn.start').removeClass('restart');


	//Sets this one to playing state.
	$('#video__' + index + ' .btn.start .fa').removeClass('fa-play').addClass('fa-repeat');
	$('#video__' + index + ' .btn.start').attr('title','Restart');
	$('#video__' + index + ' .btn.start').addClass('restart');
}

function videoStartClickEvent(e){
	
	if($(this).hasClass('restart')){
		seekVideoTo(0);
		playVideo();
	}else{
		var index = parseInt( $(this).parent().parent().attr('id').replace('video__','') );
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
	if(  $(this).find('.fa').hasClass('fa-star-o')  )
		 $(this).find('.fa').removeClass('fa-star-o').addClass('fa-star');
	else $(this).find('.fa').removeClass('fa-star').addClass('fa-star-o');

	$(this).toggleClass('diamond');	
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
			seekBarWidth = document.getElementById("timeSlider").clientWidth;

        	completedPercent = ((tempCurrentTime*100)/tempDuration).toFixed(2);
        	$('li.track#video__'+trackIndex+' .progress').css("width",completedPercent+"%");

        	history.channels[currentChannel].trackList[trackIndex].percent = completedPercent;
        	history.channels[currentChannel].trackList[trackIndex].time = tempCurrentTime;

            //update seeker
            if (!timeSeeking) {
            	$("#timeSlider").slider("value", tempCurrentTime);

                currentTimeOutput = secondsToTime(tempCurrentTime);
                document.getElementById("timer_current").innerHTML = currentTimeOutput;

                $("#fractionLoaded").css("width", (fractionLoaded*seekBarWidth) +"px");
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
