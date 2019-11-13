// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
  Grays out or [whatever the opposite of graying out is called] the option
  field.
*/

window.addEventListener('load', function() {
	// Initialize the option controls.
	options.frequency.value = window.localStorage.getItem('frequency'); // The display frequency, in minutes.
	options.dismiss.value = window.localStorage.getItem('dismiss'); // The display frequency, in minutes.

	// Set the notification frequency.
	options.frequency.onchange = function() {
		window.localStorage.setItem('frequency', options.frequency.value );
	};
	// Set the notification frequency.
	options.dismiss.onchange = function() {
		window.localStorage.setItem('dismiss', options.dismiss.value );
	};
	
	var oDiv = document.getElementById('network-data');
	chrome.runtime.getBackgroundPage(function(bgPage) {
		bgPage.checkYammer(function(resp){
			var shouldFilterNetworkList = false;
			var simpleObject = bgPage.getSimpleObjectFromYammerNetworkResponse(resp, shouldFilterNetworkList);
			bgPage.manageBadge( bgPage.getSimpleObjectFromYammerNetworkResponse(resp, true) );
			withCheckbox = true;
			oDiv.innerHTML = bgPage.getNotificationHtmlFromSimpleObject( simpleObject, withCheckbox );
			transformLinks( oDiv.getElementsByTagName("a") );
			
			var arCheckboxes = document.getElementsByName('include_network');
			for( i = 0; i < arCheckboxes.length; i++ ){
				arCheckboxes[i].onchange = function(){
					var isActive = this.checked;
					var networkId = this.value;
					bgPage.setActivatedNetworkValueById( isActive, networkId );
				}
			}
		},
		function(){
			oDiv.innerHTML = '<p class="important">You are not logged in Yammer.</p>'
				+ '<p>Login from this popup is not yet supported.</p>'
				+ '<p>To login, <a id="loginLink" href="https://www.yammer.com/login" href="#">Click here</a></p>';
			transformLinks( oDiv.getElementsByTagName("a") );
		});
	});
});