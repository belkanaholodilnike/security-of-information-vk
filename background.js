/**
 * Created by dmitry on 10/12/14.
 */

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (~tab.url.match('http(s)?://vk.com/.*')) {
        chrome.pageAction.show(tabId);
    }
});
