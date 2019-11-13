// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

window.addEventListener('load', function() {
	var oDiv = document.getElementById('content');
	chrome.runtime.getBackgroundPage(function(bgPage) {
		bgPage.checkYammer(function(resp){
			var shouldFilterNetworkList = true;
			var simpleObject = bgPage.getSimpleObjectFromYammerNetworkResponse(resp, shouldFilterNetworkList);
			var withCheckbox = false;
			oDiv.innerHTML =  bgPage.getNotificationHtmlFromSimpleObject( simpleObject, withCheckbox );
			transformLinks( oDiv.getElementsByTagName("a") );
		});
	});
});