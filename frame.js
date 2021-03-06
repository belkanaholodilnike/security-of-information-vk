/**
 * Created by dmitry on 10/13/14.
 */

function onSendButtonClick() {
  svkm.ui.showInfoMessage("Готово!", 3000);
  var text = getTextFromIframe();
  if (text != '') {
    svkm.basic.sendMessage(text);
    setTextToIframe('');
  }
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
