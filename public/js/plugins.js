// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.

$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

$.fn.scrollTo = function( target, options, callback ){
    try{
        if(typeof options == 'function' && arguments.length == 2){ callback = options; options = target; }
        var settings = $.extend({
            scrollTarget  : target,
            offsetTop     : 50,
            duration      : 500,
            easing        : 'swing'
        }, options);
        return this.each(function(){
            var scrollPane = $(this);
            var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : $(settings.scrollTarget);
            var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
            scrollPane.animate({scrollTop : scrollY }, parseInt(settings.duration), settings.easing, function(){
                if (typeof callback == 'function') { callback.call(this); }
            });
        });
        
    } catch(e){}
}

function secondsToTime(string){
    var totalSeconds = parseInt(string);
    if (isNaN(totalSeconds)) {
        totalSeconds = 0;
    }
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    if (minutes < 60) {
        //if(minutes < 10){
        //  minutes = "0" + minutes;
        //}
        return minutes + ":" + seconds;
    } else {
        var hours = Math.floor(minutes / 60);
        minutes = minutes % 60;
        if (minutes < 10 && hours > 0) {
            minutes = "0" + minutes;
        }
        //if(hours < 10){
        //  hours = "0" + hours;
        //}
        return hours + ":" + minutes + ":" + seconds;
    }
}

/**
 * ReplaceAll by Fagner Brack (MIT Licensed)
 * Replaces all occurrences of a substring in a string
 */
String.prototype.replaceAll = function( token, newToken, ignoreCase ) {
    var _token;
    var str = this + "";
    var i = -1;

    if ( typeof token === "string" ) {

        if ( ignoreCase ) {

            _token = token.toLowerCase();

            while( (
                i = str.toLowerCase().indexOf(
                    token, i >= 0 ? i + newToken.length : 0
                ) ) !== -1
            ) {
                str = str.substring( 0, i ) +
                    newToken +
                    str.substring( i + token.length );
            }

        } else {
            return this.split( token ).join( newToken );
        }

    }
    return str;
};

String.prototype.linkify_tweet = function() {
    var tweet = this.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/g, function(url) { 
        var wrap = document.createElement('div');
        var anch = document.createElement('a');
        anch.href = url;
        anch.className = "link";
        anch.target = "_blank";
        anch.innerHTML = url;
        wrap.appendChild(anch);
        return wrap.innerHTML;
    });

    tweet = tweet.replace(/(^|\s)“@(\w+)/g,'$1“<span channel="$2" class="channel" onClick="watchUsername(\'$2\')">$2</span>');
    tweet = tweet.replace(/(^|\s).@(\w+)/g,'$1<span channel="$2" class="channel" onClick="watchUsername(\'$2\')">$2</span>');
    tweet = tweet.replace(/(^|\s)@(\w+)/g, '$1<span channel="$2" class="channel" onClick="watchUsername(\'$2\')">$2</span>');
    // tweet = tweet.replace(/(^|\s)#(\w+)/g, '$1#<a href="http://search.twitter.com/search?q=%23$2" target="_blank">$2</a>');
    return tweet;
};

function insertAtCaret(areaId,text) {
    var txtarea = document.getElementById(areaId);
    // var scrollPos = txtarea.scrollTop;
    var strPos = 0;
    var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ? 
        "ff" : (document.selection ? "ie" : false ) );
    if (br == "ie") { 
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart ('character', -txtarea.value.length);
        strPos = range.text.length;
    }
    else if (br == "ff") strPos = txtarea.selectionStart;

    var front = (txtarea.value).substring(0,strPos);  
    var back = (txtarea.value).substring(strPos,txtarea.value.length); 
    txtarea.value=front+text+back;
    strPos = strPos + text.length;
    if (br == "ie") { 
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart ('character', -txtarea.value.length);
        range.moveStart ('character', strPos);
        range.moveEnd ('character', 0);
        range.select();
    }
    else if (br == "ff") {
        txtarea.selectionStart = strPos;
        txtarea.selectionEnd = strPos;
        txtarea.focus();
    }
    // txtarea.scrollTop = scrollPos;
}

if (!String.prototype.includes) {
  String.prototype.includes = function() {'use strict';
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}