/**
 * Created by dmitry on 10/12/14.
 */

/**
 * Shows or hides the extension icon depending on the current browser's URL
 */

messageLog = ["Hello, world!"];

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url.match('http(s)?://vk.com/.*')) {
        chrome.pageAction.show(tabId);
    }
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.eventName == 'messageSent') {
            messageLog.push(request.message);
        } else if (request.eventName == 'getKeyForUser') {
          userKey = svkm.keystorage.getKeyForUser(request.id);
          if (userKey) {
            sendResponse({result: 'yes', key: userKey});
          } else {
            sendResponse({result: 'no'});
          }
        } else if (request.eventName == 'getMyKey') {
          sendResponse({key: svkm.keystorage.getMyKey()});
        }
    });

