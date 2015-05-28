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
}
function hideFailedAlert() {
	$('#failed_wrapper').removeClass('failed');
}

var searchRequest, watchingUser;

function watchUsername(screen_name){

	showSearchSpinner();

	if(searchRequest) searchRequest.abort();

	searchRequest = $.getJSON( "/search/"+screen_name, function( tweets ) {
		
		hideSearchSpinner();

		hideFailedAlert();

		if(tweets.length > 0){

			ga('send', 'event', 'watch', 'screen_name', screen_name);

			$('input#search_input').val(screen_name);

			trackList = tweets;

			watchingUser = screen_name;

			var tweetElements = [];
			$.each( tweets, function( idx, tweet ) {
				var element = $('<li/>').addClass("track")
										.attr('id', "video__"+idx)
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
											.html(tweet.text.linkify_tweet())
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
				tweetElements.push(element);
			});
			
			$("#schedule_wrapper").html(tweetElements);
			$("#schedule_wrapper").animate($("#schedule_wrapper")[0].scrollHeight,500);

			// Play most recent.
			trackIndex = tweets.length;
			playNextTrack();
		} else {
			console.log('No compatible content found...');
			showFailedAlert("No recent video Tweets.");

		}

	});


	
	
}

var trackList = null;
var trackIndex = -1;

// This code loads the IFrame Player API code asynchronously.
var ytScriptTag = document.createElement('script');
ytScriptTag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(ytScriptTag, firstScriptTag);

// This function creates an <iframe> (and YouTube player) after the API code downloads.
var ytplayer, ytplayerReady, ytIframeAPIReady, playerState = 0;
function onYouTubeIframeAPIReady() {
	ytplayerReady = true;
	// loadVideo("8AvI-3Ows-8");

	setInterval(updatePlayerInfo, 33);
}

function initYouTubeIframeAPI(videoId) {
	if(ytplayerReady){
		ytIframeAPIReady = true;
		ytplayer = new YT.Player('ytplayer', {
			height:'100%',
			width: '100%',
			videoId: videoId,
			playerVars : {
				cc_load_policy: 0,
				controls : 0,
				enablejsapi: 1,
				disablekb: 1,
				html5: 1,
				iv_load_policy: 3,
				modestbranding: 0,
				origin: window.location.host,
				playsinline: 1,
				rel: 0,
				showinfo: 0
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

		playNextTrack();
	}
	else if (event.data == YT.PlayerState.PLAYING) {
		console.log("PLAYING");

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
	console.dir(event);

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

function loadVideo(videoId) {
	playerState = 0;
	if(!ytIframeAPIReady) initYouTubeIframeAPI(videoId);
	else ytplayer.loadVideoById(videoId, 0, "large");
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


// function analyzeVideoUrl(url) {
//     var vidInfo = {
//         provider: null,
//         url: url,
//         id: null
//     }
//     if(typeof url != "string") url = "";
    
//     if(url.contains('youtube.com') || url.contains('youtu.be')){
//     	vidInfo.provider = "youtube";
//     	vidInfo.id = getYouTubeID(url);
//     }
//     else if(url.contains('vimeo.com')){
//     	vidInfo.provider = "vimeo";
//     	vidInfo.id = getVimeoID(url);
//     }

//     return vidInfo;
// }

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
	playTrack(trackIndex);

}

function playTrack(index){
	var videoID = getYouTubeID(trackList[index].url);
	ga('send', 'event', 'video', 'play', videoID);
	ga('send', 'event', 'video', 'view', watchingUser);

	trackIndex = index;

	if(index>=0) {
		console.log("Starting next track... " + index + " : " + trackList[index].url);
		loadVideo(videoID);
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

	//Sets this one to playing state.
	$('#video__' + index + ' .btn.start .fa').removeClass('fa-play').addClass('fa-repeat');
	$('#video__' + index + ' .btn.start').attr('title','Restart');
}

function videoStartClickEvent(e){
	var index = parseInt( $(this).parent().parent().attr('id').replace('video__','') );
	playTrack(index);
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

        	completedPercent = ((tempCurrentTime*100)/tempDuration).toFixed(3);
        	$('li.track#video__'+trackIndex+' .progress').css("width",completedPercent+"%");

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

}