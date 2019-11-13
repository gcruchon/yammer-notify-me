// Copyright (c) 2013 Gilles CRUCHON. All rights reserved.

var INTERVAL_SIZE = 60000; //1 minute
var YAMMER_API_NETWORK_URL = "https://www.yammer.com/api/v1/networks/current.json";

var currentNotification = null; 
function show() {
	// Test for notification support.
	if (window.webkitNotifications) {
		cancelNotification();
		currentNotification = window.webkitNotifications.createHTMLNotification('notification.html');
		currentNotification.show();
		setTimeout( function(){ cancelNotification(); }, getDismissTimout() );
	}
}

function getDismissTimout(){
	dismissTimeout = 10000; //Default 10 seconds	
	if( typeof window.localStorage.getItem('dismiss') != 'undefined' ){
		dismissTimeout = 1000 * window.localStorage.getItem('dismiss')
	}
	return dismissTimeout;
}

function checkYammer(callbackSuccessFunction, callbackErrorFunction ){
	chrome.browserAction.setIcon({"path":"icon-loading.png"});
	var xhr = new XMLHttpRequest();
	xhr.open("GET", YAMMER_API_NETWORK_URL, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if( xhr.status == 200 ){
				// JSON.parse does not evaluate the attacker's scripts.
				chrome.browserAction.setIcon({"path":"icon.png"});
				var resp = JSON.parse(xhr.responseText);
				callbackSuccessFunction(resp);
			} else {
				chrome.browserAction.setIcon({"path":"icon-inactive.png"});
				chrome.browserAction.setBadgeText({"text": ''});
				if( typeof callbackErrorFunction == 'function' ){
					callbackErrorFunction();
				}
			}
		}
	}
	xhr.send();
}

function getSimpleObjectFromYammerNetworkResponse(data, shouldFilterNetworkList){
	var obj = {};
	updateNetworkLocalList(data);
	var activatedNetworks = getActivatedNetworks();
	for( var i = 0; i < data.length ; i++ ){
		var network = data[i];
		if( !shouldFilterNetworkList || activatedNetworks[network.id] ){
			obj[network.id] = {
				"name": network.name,
				"url": network.web_url,
				"inbox_unseen_thread_count": network.inbox_unseen_thread_count,
				"private_unseen_thread_count": network.private_unseen_thread_count,
				"unseen_message_count": network.unseen_message_count,
				"unseen_notification_count": network.unseen_notification_count,
				"preferred_unseen_message_count": network.preferred_unseen_message_count
			}
		}
	}
	return obj;
}

function getFingerPrintFromSimpleObject( simpleObject ){
	var fingerPrint = '';
	var orderedKeys = Object.keys(simpleObject).sort();
	for( var i = 0; i < orderedKeys.length ; i++ ){
		var network = simpleObject[orderedKeys[i]];
		fingerPrint += orderedKeys[i] + '|';
		fingerPrint += network.inbox_unseen_thread_count + '|';
		fingerPrint += network.private_unseen_thread_count + '|';
		fingerPrint += network.unseen_message_count + '|';
		fingerPrint += network.unseen_notification_count + '|';
		fingerPrint += network.preferred_unseen_message_count + '|';
	}
	return fingerPrint;
}

function getNotificationHtmlFromSimpleObject( simpleObject, withCheckbox ){
	var strHTML = '';
	var activatedNetworks = getActivatedNetworks();
	for( key in simpleObject ){
		var network = simpleObject[key];
		strHTML += '<div class="network">';
		strHTML +=     '<div class="title">';
		strHTML +=         '<a href="' + network.url + '">' + network.name + '</a><br/>';
		strHTML +=     '</div>';
		if( withCheckbox ){
			strChecked = '';
			if( activatedNetworks[key] ){
				strChecked = ' checked';
			}
			strHTML += '<div class="content include">';
			strHTML +=     '<input type="checkbox" name="include_network" id="include_network_' + key + '" value="' + key + '"' + strChecked + ' /> '
			strHTML +=     '<label for="include_network_' + key + '">Notify this network</label>';
			strHTML += '</div>';
		}
		var o = { "separator" : '' };
		var localCounters = '';
		var extraClass = '';
		localCounters += getHtmlForCounter( 'Inbox', network.inbox_unseen_thread_count, o );
		localCounters += getHtmlForCounter( 'Private thread(s)', network.private_unseen_thread_count, o );
		localCounters += getHtmlForCounter( 'Message(s)', network.unseen_message_count, o );
		localCounters += getHtmlForCounter( 'Notification(s)', network.unseen_notification_count, o );
		//localCounters += getHtmlForCounter( 'Preferred', network.preferred_unseen_message_count, o );
		if( localCounters == '' ){
			localCounters = 'No notification';
			extraClass = ' empty';
		} else {
			extraClass = ' not-empty';
		}
		strHTML +=     '<div class="content' + extraClass + '">';
		strHTML +=         localCounters;
		strHTML +=     '</div>';
		strHTML += '</div>';
	}
	return strHTML;
}

function getHtmlForCounter( label, count, o ){
	var ret = '';
	if( count > 0 ){
		ret = o.separator + label + ': ' + count;
		o.separator = ' | ';
	}
	return ret;
}

function getUnseenTotalFromSimpleObject( simpleObject ){
	var nbUnseen = 0;
	for( key in simpleObject ){
		var network = simpleObject[key];
		nbUnseen += network.inbox_unseen_thread_count;
		nbUnseen += network.private_unseen_thread_count;
		nbUnseen += network.unseen_message_count;
		nbUnseen += network.unseen_notification_count;
		//nbUnseen += network.preferred_unseen_message_count;
	}
	return nbUnseen;
}

function handleYammerNetworkResponse(data){
	var shouldFilterNetworkList = true;
	var simpleObject = getSimpleObjectFromYammerNetworkResponse(data, shouldFilterNetworkList);
	manageBadge( simpleObject );
	var nbUnseen = getUnseenTotalFromSimpleObject( simpleObject );
	if( nbUnseen > 0 ){
		var currentFingerPrint = getFingerPrintFromSimpleObject(simpleObject);
		var previousFingerPrint = window.localStorage.getItem('fingerPrint');
		if ( currentFingerPrint != previousFingerPrint ){
			window.localStorage.setItem('fingerPrint', currentFingerPrint);
			show();
		}
	}
}

function updateNetworkLocalList(data){
	var newActivatedNetworks = {};
	var prevActivatedNetworks = getActivatedNetworks();
	for( var i = 0; i < data.length ; i++ ){
		var network = data[i];
		newActivatedNetworks[network.id] = true;
		if( prevActivatedNetworks.hasOwnProperty(network.id) ){
			newActivatedNetworks[network.id] = prevActivatedNetworks[network.id];
		}
	}
	setActivatedNetworks( newActivatedNetworks )
}

function setActivatedNetworks( obj ){
	window.localStorage.setItem( 'activatedNetworks', JSON.stringify( obj ) );
}

function getActivatedNetworks(){
	return JSON.parse( window.localStorage.getItem('activatedNetworks') );
}

function setActivatedNetworkValueById( isActive, networkId ){
	tempActivatedNetworks = getActivatedNetworks();
	tempActivatedNetworks[networkId] = isActive;
	setActivatedNetworks( tempActivatedNetworks );
}

function manageBadge( simpleObject ){
	var nbUnseen = getUnseenTotalFromSimpleObject( simpleObject );
	var txt = '';
	if( nbUnseen > 0 && nbUnseen <= 9 ){
		txt = ' ' + nbUnseen + ' ';
	} else if( nbUnseen > 9 ){
		txt = ' 9+ ';
	}
	chrome.browserAction.setBadgeText({"text": txt});
	chrome.browserAction.setBadgeBackgroundColor({"color": [200, 0, 0, 180]});
}

function cancelNotification(){
	if( currentNotification ){
		currentNotification.cancel();
		currentNotification = null;
	}
}

// Conditionally initialize the options.
window.localStorage.clear();
if (!window.localStorage.getItem('isInitialized')) {
	window.localStorage.setItem('frequency', 5);        // The display frequency, in minutes.
	window.localStorage.setItem('fingerPrint', '');     // The finger print, to avoid a notification to be displayed twice
	window.localStorage.setItem('isInitialized', true); // The option initialization.
	window.localStorage.setItem('dismiss', 10);
	setActivatedNetworks({});
}

function atLeastOneNetworkIsActivated(){
	var activatedNetworks = getActivatedNetworks();
	for( key in activatedNetworks ){
		if( activatedNetworks[key] ){
			return true;
		}
	}
	return false;
}

// While activated, show notifications at the display frequency.
checkYammer(handleYammerNetworkResponse);

var interval = 0; // The display interval, in minutes.

setInterval(function() {
	interval++;

	if (
		atLeastOneNetworkIsActivated() &&
		window.localStorage.getItem('frequency') <= interval
	) {
		checkYammer(handleYammerNetworkResponse);
		interval = 0;
	}
}, INTERVAL_SIZE);