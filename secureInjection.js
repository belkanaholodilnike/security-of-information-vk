/**
 * Created by melges on 12.10.2014.
 */

console.log("SVkMessage loaded");
var storedUrl = window.location.href;

window.setInterval(function () {
    if (window.location.href != storedUrl) {
        storedUrl = window.location.href;
        svkm.basic.urlChanged();
    }
}, 100);

$(document).ready(function() {
  svkm.basic.urlChanged();
});

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.event == "enableForm") {
    localStorage.setItem(IS_ENABLED_KEY, 'true');
    svkm.basic.urlChanged();
    sendResponse({});
  } else if (request.event == "disableForm") {
    localStorage.setItem(IS_ENABLED_KEY, 'false');
    svkm.basic.urlChanged();
    sendResponse({});
  } else if (request.event == "isSecureFormEnabled") {
    sendResponse({result: svkm.basic.isSecureFormEnabled()});
  }
});