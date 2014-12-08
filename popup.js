/**
 * Created by dmitry on 10/12/14.
 */

$(document).ready(function() {
  setUpEnableDisableButton();
});

function setUpEnableDisableButton() {
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.sendMessage(tab.id, {event: "isSecureFormEnabled"}, function (response) {
      if (response.result) {
        $("#enable-disable-button").text('Выключить');
      } else {
        $("#enable-disable-button").text('Включить');
      }
    });
  });
  $("#enable-disable-button").click(function () {
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.sendMessage(tab.id, {event: "isSecureFormEnabled"}, function (response) {
        if (response.result) {
          chrome.tabs.getSelected(null, function (tab) {
            chrome.tabs.sendMessage(tab.id, {event: "disableForm"}, function (response) {
              $("#enable-disable-button").text('Включить');
            });
          });
        } else {
          chrome.tabs.getSelected(null, function (tab) {
            chrome.tabs.sendMessage(tab.id, {event: "enableForm"}, function (response) {
              $("#enable-disable-button").text('Выключить');
            });
          });
        }
      });
    });
  });
}

