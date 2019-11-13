var arUrls = [];
function transformLinks( objList ){
	for( i = 0; i < objList.length; i++ ){
		arUrls.push(objList[i].href);
		objList[i].onclick = function(){
			openYammerURL(this);
		}
	}
}

function openYammerURL( objLink ){
	var url = objLink.href;
	chrome.tabs.getAllInWindow(window.id, function(tabList) {
		var yammerTabId = null;
		for( i = 0; i < tabList.length; i++ ){
			var tab = tabList[i];
			if( tab.url.substr(0,23) == 'https://www.yammer.com/' ){
				yammerTabId = tab.id;
			}
		}
		if( yammerTabId != null ){
			chrome.tabs.update(yammerTabId, {
				"url" : url,
				"active" : true
			},
			function(tab){
				manageYammerLoaded(tab.id);
			});
		} else {
			chrome.tabs.create({
				"url" : url
			},
			function(tab){
				manageYammerLoaded(tab.id);
			});
		}
	});
}

function manageYammerLoaded( tabId ){
	var checkYammerListener = function(tId, changeInfo, tab) {
		if (tabId != tId || changeInfo.status != "complete"){
			return;
		}
		chrome.tabs.onUpdated.removeListener(checkYammerListener);
		chrome.runtime.getBackgroundPage(function(bgPage) {
			bgPage.checkYammer(bgPage.handleYammerNetworkResponse);
		});
	}
	chrome.tabs.onUpdated.addListener(checkYammerListener);
}