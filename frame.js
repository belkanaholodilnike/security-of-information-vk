/**
 * Created by dmitry on 10/13/14.
 */

function onSendButtonClick() {
  chrome.runtime.sendMessage({eventName: "messageSent", message: getTextFromIframe()},
      function(response) {
      console.log(response.farewell);
  });
  svkm.ui.showInfoMessage("Готово!", 3000);
  var text = getTextFromIframe();

  // TODO: change to sendMessage()
  svkm.basic.sendMessageUnencrypted(text);

  //svkm.basic.sendMessage(text);
}

function getTextFromIframe() {
  return getSecuredDocument().getElementById("svkm_message").textContent;
}

function setTextToIframe(str) {
  getSecuredDocument().getElementById("svkm_message").textContent = str;
}

function getSecuredDocument() {
  var s_frame = document.getElementById("svkm_secure_iframe");
  if(s_frame == null) {
    return null;
  }

  return s_frame.contentWindow.document;
}
