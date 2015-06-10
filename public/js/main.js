/*! Fire-Sauce-TV 2015-06-10 */
function showSearchSpinner(){$("#searching_wrapper").addClass("searching")}function hideSearchSpinner(){$("#searching_wrapper").removeClass("searching")}function showFailedAlert(a){$("#failed_wrapper").addClass("failed"),$("#failed_message").text(a),setTimeout(function(){hideFailedAlert()},5e3)}function hideFailedAlert(){$("#failed_wrapper").removeClass("failed")}function watchUsername(a){a=a.toLowerCase(),showSearchSpinner();var b=null;if(history.channels[a]&&history.channels[a].trackList.length>0){console.log("Previously watched.. Pulling only since last id.");var c=history.channels[a].trackList.length;b=history.channels[a].trackList[c-1].id,tracksLoaded=0,$("#schedule_wrapper").html(""),renderTweets(history.channels[a].trackList),$("input#search_input").val(a),history.watching=a.toLowerCase(),getTwitterUserInfo(a,updateChannelInfo)}searchRequest&&searchRequest.abort();var d="/search/?screen_name="+a;b&&(d=d+"&sinceID="+b),searchRequest=$.getJSON(d,function(c){hideSearchSpinner(),hideFailedAlert(),c.length>0?(ga("send","event","watch","screen_name",a),$("input#search_input").val(a),$("input#search_input").val(a),history.watching=a.toLowerCase(),getTwitterUserInfo(a,updateChannelInfo),b?history.channels[history.watching].trackList=history.channels[history.watching].trackList.concat(c):(tracksLoaded=0,$("#schedule_wrapper").html(""),history.channels[history.watching]={trackList:c}),renderTweets(c),trackIndex=c.length,playNextTrack()):(console.log("No compatible content found..."),showFailedAlert("No new recent videos."),b&&(history.channels[history.watching].trackIndex>=0?(trackIndex=history.channels[history.watching].trackIndex,playTrack(trackIndex)):(trackIndex=c.length,playNextTrack())))}).fail(function(a,b,c){console.log(b+": "+c)})}function updateChannelInfo(a){history.channels[history.watching].followed?$("#channel_info_wrapper").addClass("followed"):$("#channel_info_wrapper").removeClass("followed"),$("#channel_info_wrapper").css("display",""),$("#channel_info_wrapper .avatar").attr("src",a.profile_image_url.replace("http:","")),$("#channel_info_wrapper .name").text(a.name),$("#channel_info_wrapper .screen_name").text("@"+a.screen_name),location.hash="/"+a.screen_name}function renderTweets(a){$.each(a,function(b,c){var d=$("<li/>").addClass("track").attr("id","video__"+tracksLoaded).append($("<div/>").addClass("indicator")).append($("<div/>").addClass("progress")).append($("<a/>").addClass("started").attr("href","http://twitter.com/"+c.user.screen_name+"/status/"+c.id).attr("target","_blank").append($("<span/>").addClass("fromNow").text(moment(new Date(c.created_at)).fromNow())).append($("<span/>").addClass("exactDate").text(moment(new Date(c.created_at)).format("llll")))).append($("<div/>").addClass("text").html(twemoji.parse(c.text.linkify_tweet()))).append($("<div/>").addClass("controls").append($("<div/>").addClass("btn pause").html("<i class='fa fa-pause'></i>").attr("title","Pause")).append($("<div/>").addClass("btn start").html("<i class='fa fa-play'></i>").attr("title","Start")).append($("<div/>").addClass("btn right fav").html("<i class='fa fa-diamond'></i>").attr("title","Diamond in the rough")).append($("<div/>").addClass("btn right resauce").html("<i class='fa fa-retweet'></i>").attr("title","Resauce to your stream")));d.find(".btn.start").bind("click",videoStartClickEvent),d.find(".btn.pause").bind("click",videoPauseClickEvent),d.find(".btn.fav").bind("click",videoFavClickEvent),c.percent>=0&&d.find("div.progress").attr("style","width: "+c.percent+"%"),c.favorited&&d.find("div.fav").addClass("diamond"),c.watched&&d.addClass("watched"),c.skipped&&d.addClass("skipped"),c.error&&d.addClass("error"),$("#schedule_wrapper").append(d),tracksLoaded++,b==a.length-1}),scrollToTrack()}function onYouTubeIframeAPIReady(){ytplayerReady=!0,setInterval(updatePlayerInfo,100)}function initYouTubeIframeAPI(a,b){ytplayerReady&&(ytIframeAPIReady=!0,ytplayer=new YT.Player("ytplayer",{height:"100%",width:"100%",videoId:a,playerVars:{start:parseInt(b),cc_load_policy:0,controls:1,enablejsapi:1,disablekb:1,html5:1,iv_load_policy:3,modestbranding:1,origin:window.location.host,playsinline:1,rel:0,theme:"light",showinfo:1},events:{onReady:onYtPlayerReady,onError:onYtPlayerError,onStateChange:onYtPlayerStateChange}}))}function onYtPlayerReady(a){a.target.playVideo()}function onYtPlayerStateChange(a){playerState=a.data,a.data==YT.PlayerState.ENDED?(console.log("ENDED"),history.channels[history.watching].trackList[trackIndex].watched=!0,history.channels[history.watching].trackList[trackIndex].skipped=null,history.channels[history.watching].trackList[trackIndex].percent=100,$("li.track#video__"+trackIndex).css("width","").addClass("watched").find("div.progress").attr("style",""),playNextTrack()):a.data==YT.PlayerState.PLAYING?(console.log("PLAYING"),history.channels[history.watching].trackList[trackIndex].started=!0,history.channels[history.watching].trackList[trackIndex].skipped=null,history.channels[history.watching].trackIndex=trackIndex,history.channels[history.watching].lastWatched=(new Date).toString(),history.channels[history.watching].trackList[trackIndex].error&&(history.channels[history.watching].trackList[trackIndex].error=null,$("li.track#video__"+trackIndex).removeClass("error")),store.save(history),$("#timeSlider").slider("option","max",ytplayer.getDuration()),$("li.track.playing div.btn.pause i.fa").removeClass("fa-play").addClass("fa-pause"),$("li.track.playing div.btn.pause").attr("title","Pause")):a.data==YT.PlayerState.PAUSED?(console.log("PAUSED"),$("li.track.playing div.btn.pause i.fa").removeClass("fa-pause").addClass("fa-play"),$("li.track.playing div.btn.pause").attr("title","Play")):a.data==YT.PlayerState.BUFFERING?(console.log("BUFFERING"),setTimeout(function(){playVideo()},1e3)):a.data==YT.PlayerState.CUED&&console.log("CUED")}function onYtPlayerError(a){console.log("Error: "+a),console.dir(a.data),(150==a.data||2==a.data)&&(history.channels[history.watching].trackList[trackIndex].error=a.data),$("li.track#video__"+trackIndex).addClass("error"),playNextTrack()}function seekVideoTo(a,b){ytplayer.seekTo(a,b)}function playVideo(){ytplayer.playVideo()}function pauseVideo(){ytplayer.pauseVideo()}function stopVideo(){ytplayer.stopVideo(),ytplayer.clearVideo()}function loadVideo(a,b){b||(b=0),playerState=0,ytIframeAPIReady?ytplayer.loadVideoById(a,b,"large"):initYouTubeIframeAPI(a,b)}function setVolume(a){a>100?a=100:0>a&&(a=0),ytplayer.setVolume(a)}function getVolume(a){return ytplayer.getVolume()}function toggleMute(a){ytplayer.isMuted()?ytplayer.unMute():ytplayer.mute()}function getYouTubeID(a){var b=/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/,c=a.match(b);return c&&11==c[7].length?c[7]:""}function getVimeoID(a){var b=/vimeo.*\/(\d+)/i.exec(a);return b?b[1]:void 0}function playNextTrack(){trackIndex--,playerState=0,playMostRecentUnfinished()}function playMostRecentUnfinished(){for(var a=history.channels[history.watching].trackList.length,b=a-1;b>=0;b--){if(!history.channels[history.watching].trackList[b].watched&&(!history.channels[history.watching].trackList[b].skipped||trackIndex>=b)&&!history.channels[history.watching].trackList[b].error){playTrack(b);break}0==b&&playMostRecentSkipped()}}function playMostRecentSkipped(){for(var a=history.channels[history.watching].trackList.length,b=a-1;b>=0;b--){if(!history.channels[history.watching].trackList[b].watched&&history.channels[history.watching].trackList[b].skipped&&!history.channels[history.watching].trackList[b].error){playTrack(b);break}0==b&&loopEnabled&&playTrack(trackIndex)}}function playTrack(a){try{var b=getYouTubeID(history.channels[history.watching].trackList[a].url),c=history.channels[history.watching].trackList[a].percent||0,d=history.channels[history.watching].trackList[a].time||0;c>=100&&(d=0),ga("send","event","video","play",b),ga("send","event","video","view",history.watching),trackIndex=a,a>=0&&(console.log("Starting next track... "+a+" : "+history.channels[history.watching].trackList[a].url),loadVideo(b,d)),$("li.track").removeClass("playing"),$("li.track#video__"+a).addClass("playing"),scrollToTrack(),$(".track .controls .btn.start .fa").removeClass("fa-repeat").addClass("fa-play"),$(".track .controls .btn.start").attr("title","Start"),$(".track .controls .btn.start").removeClass("restart"),$("#video__"+a+" .btn.start .fa").removeClass("fa-play").addClass("fa-repeat"),$("#video__"+a+" .btn.start").attr("title","Restart"),$("#video__"+a+" .btn.start").addClass("restart"),$("#track_tweet_wrapper").html(history.channels[history.watching].trackList[a].text.linkify_tweet())}catch(e){console.log("error caught for playTrack("+a+")")}}function scrollToTrack(){$("#schedule_wrapper .playing")&&$("#schedule_wrapper .playing").offset()&&$("#schedule_wrapper").animate({scrollTop:$("#schedule_wrapper").scrollTop()+$("#schedule_wrapper .playing").offset().top-116},500)}function videoStartClickEvent(a){if($(this).hasClass("restart"))seekVideoTo(0),playVideo();else{var b=parseInt($(this).parent().parent().attr("id").replace("video__",""));trackIndex>=0&&(history.channels[history.watching].trackList[trackIndex].skipped=!0),playTrack(b)}}function videoPauseClickEvent(a){1==playerState?pauseVideo():(playVideo(),$("li.track.playing div.btn.pause i.fa").removeClass("fa-play").addClass("fa-pause"))}function videoFavClickEvent(a){var b=$(this).parent().parent().attr("id");b=b.replace("video__",""),b=parseInt(b),$(this).hasClass("diamond")?($(this).removeClass("diamond"),history.channels[history.watching].trackList[b].favorited=!1):($(this).addClass("diamond"),history.channels[history.watching].trackList[b].favorited=!0)}function getTwitterUserInfo(a,b){if(console.log(history.watching),history.channels[history.watching]&&history.channels[history.watching].info)return b(history.channels[history.watching].info),history.channels[history.watching].info;getUserRequest&&getUserRequest.abort();var c="/userInfo/?screen_name="+a;getUserRequest=$.getJSON(c,function(a){console.log("Fetched Twitter user's data"),a&&(history.channels[history.watching].info=a),b&&b(a)})}function updatePlayerInfo(){ytplayer&&1==playerState&&(fractionLoaded=ytplayer.getVideoLoadedFraction(),tempCurrentTime=ytplayer.getCurrentTime(),tempDuration=ytplayer.getDuration(),completedPercent=(100*tempCurrentTime/tempDuration).toFixed(2),$("li.track#video__"+trackIndex+" .progress").css("width",completedPercent+"%"),history.channels[history.watching].trackList[trackIndex]&&(history.channels[history.watching].trackList[trackIndex].percent=completedPercent,history.channels[history.watching].trackList[trackIndex].time=tempCurrentTime),timeSeeking||($("#timeSlider").slider("value",tempCurrentTime),currentTimeOutput=secondsToTime(tempCurrentTime),document.getElementById("timer_current").innerHTML=currentTimeOutput),durationTimeOutput=secondsToTime(tempDuration),document.getElementById("timer_duration").innerHTML=durationTimeOutput,prevCurrentTime=tempCurrentTime,prevDuration=tempDuration),store.save(history)}function renderChannels(a){$("#followed_wrapper").html(""),$("#history_wrapper").html("");var b=[];for(var c in a)a[c].id=c,b.push(a[c]);b.sort(function(a,b){return new Date(a.lastWatched)-new Date(b.lastWatched)}),$.each(b,function(a,b){var c=$("<li/>").addClass("channel").attr("id","channel__"+b.id).attr("channel",b.id).append($("<div/>").addClass("options").append($("<div/>").addClass("btn delete").html('<i class="fa fa-remove"></i>'))).append($("<div/>").addClass("info").append($("<img>").addClass("avatar").attr("src",b.info.profile_image_url.replace("http:",""))).append($("<div/>").addClass("name").html(b.info.name)).append($("<div/>").addClass("screen_name").html("@"+b.info.screen_name)).append($("<div/>").addClass("views").html("&nbsp;"+getWatchedCount(b.trackList)+" / "+b.trackList.length+"&nbsp;"))).append($("<input>").addClass("follow").attr("type","button").val("FOLLOW"));c.find("div.info").bind("click",function(){var a=$(this).parent().attr("channel");watchUsername(a)}),c.find("div.info").bind("contextmenu",function(a){a.preventDefault(),$(this).parent().toggleClass("edit")}),c.find("div.btn.delete").bind("click",function(){var a=$(this).parent().parent().attr("channel");console.log("delete "+a),delete history.channels[a],$(this).parent().parent().remove()}),c.find("input.follow").bind("click",function(){var a=$(this).parent().attr("channel");$(this).parent().hasClass("followed")?($(this).parent().removeClass("followed"),$(this).val("FOLLOW"),history.channels[a].followed=!1,history.watching==a&&$("#channel_info_wrapper").removeClass("followed")):($(this).parent().addClass("followed"),$(this).val("FOLLOWED"),history.channels[a].followed=!0,history.watching==a&&$("#channel_info_wrapper").addClass("followed"))}),b.followed&&(c.addClass("followed"),c.find("input.follow").val("FOLLOWED")),b.followed?$("#followed_wrapper").prepend(c):$("#history_wrapper").prepend(c)})}function getWatchedCount(a){var b=0;for(var c in a)b+=a[c].watched?1:0;return b}$(window).bind("load",function(){$("input#search_input").bind("keydown",function(a){(a.keyCode>=48&&a.keyCode<=90||a.keyCode>=96&&a.keyCode<=105||189==a.keyCode)&&(a.altKey||a.ctrlKey||a.metaKey||(this.selectionStart==this.selectionEnd?15==this.value.length&&a.preventDefault():189!=a.keyCode||a.shiftKey||a.preventDefault())),13==a.keyCode&&$("input#search_button").click()}),$("input#search_input").bind("paste",function(a){a.preventDefault();var b=a.originalEvent.clipboardData.getData("text/plain"),c=/[^a-z0-9_]/gi,d=b;if(c.test(d)&&(b=d.replace(c,"")),this.selectionStart==this.selectionEnd)15!=this.value.length&&insertAtCaret("search_input",b);else{var e=this.selectionStart,f=this.selectionEnd-this.selectionStart+(15-this.value.length),g=b.substring(0,f),h=this.value;h=h.slice(0,this.selectionStart)+h.slice(this.selectionEnd),this.value=h,this.setSelectionRange(e,e),insertAtCaret("search_input",g)}}),$("input#search_input").bind("input",function(a){var b=this.selectionStart,c=/[^a-z0-9_]/gi,d=$(this).val();c.test(d)&&($(this).val(d.replace(c,"")),b--),this.value.length>15&&(this.value=this.value.slice(0,-1)),this.setSelectionRange(b,b)}),$("input#search_button").bind("click",function(a){var b=$("input#search_input").val();b.length>0&&(console.log("fire: "+b),ga("send","event","search","screen_name",b),watchUsername(b),hideFailedAlert())}),$("input#cancel_search_button").bind("click",function(a){$("#searching_wrapper").removeClass("searching"),searchRequest&&searchRequest.abort()}),$("input#close_failed_button").bind("click",function(a){hideFailedAlert()}),$("#player_watermark").bind("click",function(a){$(this).hasClass("live")?$(this).removeClass("live"):$(this).addClass("live")}),$("#timeSlider").slider({animate:"fast",orientation:"horizontal",range:"min",min:0,max:100,value:0,start:function(){timeSeeking=!0},slide:function(){$("#timeSlider").slider("value")},stop:function(){var a=$("#timeSlider").slider("value");seekVideoTo(a,!0),setTimeout(function(){timeSeeking=!1},100)},change:function(){}}),$("#channel_info_wrapper").bind("click",function(a){$(this).hasClass("followed")?($(this).removeClass("followed"),$("#channel__"+history.watching).removeClass("followed"),$("#channel__"+history.watching+" .follow").val("FOLLOW"),history.channels[history.watching].followed=!1):($(this).addClass("followed"),$("#channel__"+history.watching).addClass("followed"),$("#channel__"+history.watching+" .follow").val("FOLLOWED"),history.channels[history.watching].followed=!0)}),$("#titlebar_wrapper .btn").bind("click",function(a){if(!$(this).hasClass("active")){var b=$(this).attr("for");$("#titlebar_wrapper .btn").removeClass("active"),$(this).addClass("active"),$("#chrome_wrapper .panel").css("display","none"),$("#chrome_wrapper .panel#"+b).css("display",""),"channels_wrapper"==b?renderChannels(history.channels):"watch_wrapper"==b&&scrollToTrack()}}),$("#toggle_sidebar_btn").bind("click",function(a){$("#main_wrapper").hasClass("side_open")?$("#main_wrapper").removeClass("side_open"):$("#main_wrapper").addClass("side_open")}),$("#twitter_signin_btn").bind("click",function(a){$("#splash_wrapper").css("display","none"),$("#titlebar_wrapper .btn.watching").click()}),$("#twitter_signout_btn").bind("click",function(a){$("#splash_wrapper").css("display",""),pauseVideo()});var a=location.hash||"";a=a.replace("#/","").replace("#",""),a.length>0&&(watchUsername(a),$("#splash_wrapper").css("display","none"))});var searchRequest,getUserRequest,history={key:"",channels:null,watching:""};history.key="history",history.channels={};var trackIndex=-1,tracksLoaded=0,store=new Lawnchair({name:"firesauce",adapter:"dom"},function(a){a.get("history",function(a){a&&(history.channels=a.channels)})}),ytScriptTag=document.createElement("script");ytScriptTag.src="https://www.youtube.com/iframe_api";var firstScriptTag=document.getElementsByTagName("script")[0];firstScriptTag.parentNode.insertBefore(ytScriptTag,firstScriptTag);var ytplayer,ytplayerReady,ytIframeAPIReady,playerState=0,errorCodes={150:"This video is unavailable. Possible embedding disabled.",2:"This video ID is invalid."},loopEnabled=!0,markerWidth=0,prevCurrentTime=0,prevDuration=0,currentTime=0,tempCurrentTime=0,tempDuration=0,durationTimeOutput=0,currentTimeOutput=0,seekBarWidth,fractionLoaded,timeSeeking=!1,volSeeking=!1,completedPercent=0;