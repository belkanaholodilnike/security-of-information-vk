/**
 * Created by dmitry on 10/12/14.
 */

$(document).ready(function() {
    $("#send").click(function() {
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendRequest(tab.id, {type: "send", message: "Test"}, function(response) {

            });
        });
    });
});
