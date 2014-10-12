/**
 * Created by melges on 12.10.2014.
 */
console.log("SVkMessage loaded");

var storedUrl = window.location.href;

window.setInterval(function () {
    if (window.location.href != storedUrl) {
        storedUrl = window.location.href;
        urlChanged();
    }
}, 100);
window.addEventListener("load", urlChanged, false);