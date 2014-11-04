/**
 * Created by dmitry on 10/12/14.
 */

function init() {
    var bgPage = chrome.extension.getBackgroundPage();
    bgPage.log("hi");
    var logDiv = document.getElementById("popup-log");
    alert('fddf');
    for (var i = 0; i < messageLog.length; i++) {
        var message = messageLog[i];
        logDiv.innerHTML += "<div class='popup-log-message'>" + message + "</div>";
    }
};

document.addEventListener('DOMContentLoaded', init);

