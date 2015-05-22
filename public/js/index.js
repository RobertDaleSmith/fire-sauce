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

			$.getJSON( "/search/"+query, function( tweets ) {
				
				if(tweets.length > 0){
					
					trackList = tweets;

					var tweetElements = [];
					$.each( tweets, function( idx, tweet ) {
						var element = $('<li/>').addClass("show")
												.attr('id', "video__"+idx)
												.append($('<div/>')
													.addClass("started")
													.text( moment(new Date(tweet.created_at)).fromNow() )
												)
												.append($('<div/>')
													.addClass("text")
													.html(tweet.text)
												)
												// .append($('<div/>')
												// 	.addClass("url")
												// 	.text(tweet.url)
												// )
												.append($('<div/>')
													.addClass("indicator")
												)
												.append($('<div/>')
													.addClass("progress")
												)
												;
						element.bind('click', showListElClickEvent);
						tweetElements.push(element);
					});

					$("#schedule_wrapper").html(tweetElements);
					$("#schedule_wrapper")[0].scrollTop = $("#schedule_wrapper")[0].scrollHeight;

					// Play most recent.
					trackIndex = tweets.length;
					playNextTrack();
				}

			});

		}		
	});

	$('#player_watermark').bind('click', function(e) {
		playNextTrack();
	});

	

});

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

	setInterval(updatePlayerInfo, 250);
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
				// html5: 1,
				iv_load_policy: 3,
				modestbranding: 1,
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
	if (event.data == YT.PlayerState.ENDED) {
		console.log("ENDED");
		playNextTrack();
	}
	else if (event.data == YT.PlayerState.PLAYING) {
		console.log("PLAYING");
	}
	else if (event.data == YT.PlayerState.PAUSED) {
		console.log("PAUSED");
	}
	else if (event.data == YT.PlayerState.BUFFERING) {
		console.log("BUFFERING");
	}
	else if (event.data == YT.PlayerState.CUED) {
		console.log("CUED");
	}

	playerState = event.data;
	console.log(playerState);

}

var errorCodes = {
	150 : "This video is unavailable.",
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


function analyzeVideoUrl(url) {
    var vidInfo = {
        provider: null,
        url: url,
        id: null
    }
    if(typeof url != "string") url = "";
    
    if(url.contains('youtube.com') || url.contains('youtu.be')){
    	vidInfo.provider = "youtube";
    	vidInfo.id = getYouTubeID(url);
    }
    else if(url.contains('vimeo.com')){
    	vidInfo.provider = "vimeo";
    	vidInfo.id = getVimeoID(url);
    }

    return vidInfo;
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

	$('li.show#video__'+trackIndex).addClass('watched');
	trackIndex--;
	playTrack(trackIndex);
}

function playTrack(index){
	trackIndex = index;
	if(index>=0) {
		console.log("Starting next track... " + index + " : " + trackList[index].url);
		loadVideo(getYouTubeID(trackList[index].url));
	}
	$('li.show').removeClass('playing');
	$('li.show#video__'+index).addClass('playing');

	var thisOffsetTop = 0;
	try{ thisOffsetTop = $("#video__"+index).offset().top; }catch(e){}

	var elementFromTop = $("#schedule_wrapper").scrollTop() + thisOffsetTop - 68;
	$("#schedule_wrapper")[0].scrollTop = elementFromTop;
}

function showListElClickEvent(e){
	var index = parseInt( this.id.replace('video__','') );
	playTrack(index);
}

function cleanTweetText(text){

	// text = text.replace(/^(\[url=)?(http?:\/\/)?(www\.|\S+?\.)(\S+?\.)?\S+$\s*/mg, '');

	return text;

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
	completedWidth, 
	fractionLoaded, 
	fractionLoadedWidth,
	timeSeeking = false, 
	volSeeking = false,
	completedPercent = 0;

// Display information about the current state of the player
function updatePlayerInfo() {
  
    if(ytplayer){

    	try{

    		tempCurrentTime = parseInt(ytplayer.getCurrentTime().toFixed(0));
        	tempDuration = parseInt(ytplayer.getDuration().toFixed(0));	

    	}catch(e){}
        
        if(playerState == 1) {

        	completedPercent = ((tempCurrentTime * 100) / tempDuration).toFixed(0);
        	$('li.show#video__'+trackIndex+' .progress').css("width",completedPercent+"%");

            seekBarWidth = document.getElementById("timeSlider").clientWidth;
            completedWidth = ((tempCurrentTime * (seekBarWidth - markerWidth)) / tempDuration).toFixed(0);

            fractionLoaded = ytplayer.getVideoLoadedFraction();
            fractionLoadedWidth = ((fractionLoaded * (seekBarWidth)));

            //update seeker
            if (!timeSeeking) {
            	$("#timeSlider .marker").css("left",completedWidth+"px");
            	$("#timeSlider .complete").css("width",completedWidth+"px");

                currentTimeOutput = secondsToTime(tempCurrentTime);
                document.getElementById("timer_current").innerHTML = currentTimeOutput;

                $("#fractionLoaded").css("width",fractionLoadedWidth+"px");
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