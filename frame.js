/**
 * Created by dmitry on 10/13/14.
 */

function onSendButtonClick() {
  console.log("Send");
  chrome.runtime.sendMessage({eventName: "messageSent", message: getTextFromIframe()},
      function(response) {
      console.log(response.farewell);
  });
  sendMessage(getTextFromIframe());
}

function getTextFromIframe() {
  return getSecuredDocument().getElementById("svkm_message").textContent;
}

function getSecuredDocument() {
  var s_frame = document.getElementById("svkm_secure_iframe");
  if(s_frame == null) {
    return null;
  }

  return s_frame.contentWindow.document;
}
