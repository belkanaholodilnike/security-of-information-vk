/**
 * Created by melges on 12.10.2014.
 */

var im_editable = null;

svkm = function () {

}
svkm.basic = function () {

}
svkm.crypto = function () {

}

var MESSAGE_TAG_KEY_EXCHANGE_INIT = '__VKSEC:EXCH_KEYS:';
var MESSAGE_TAG_ENCRYPTED = '__VKSEC:ENCRYPTED:';

/**
 * Function parse page url and return value of specified parameter.
 * @param name parameter name (key)
 * @returns {string} value of parameter with specified name.
 */
svkm.basic.getParameterByName = function (name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/**
 * Function generate id of messages editable form.
 * @returns {string} name of messages editable form.
 */
svkm.basic.getImEditableId = function () {
    // sel is some magic number which is associated with recipient
    // It would added in editable id
    var sel = svkm.basic.getParameterByName("sel");
    if (sel == null) {
        return null;
    }

    console.log('Editable id is ' + "im_editable" + sel);
    return "im_editable" + sel;
}

svkm.basic.getImEditable = function () {
  return document.getElementById(svkm.basic.getImEditableId());
}

svkm.basic.isPersonalChatImEditableId = function (id) {
  return id.match(/im_editable\d+/) != null;
}

svkm.basic.urlChanged = function () {
    var imEditableId = svkm.basic.getImEditableId();
    if(imEditableId == null) {
        return null;
    }

    //var messageTextEdit = document.getElementById(imEditableId);
    //messageTextEdit.textContent = "Text injected " + imEditableId;

  if (svkm.basic.isPersonalChatImEditableId(imEditableId)) {
    svkm.basic.replaceVkImEditable();
  } else {
    svkm.basic.restoreVkImEditable();
  }
}

svkm.crypto.encrypt = function (msg, key) {
  return MESSAGE_TAG_ENCRYPTED + CryptoJS.AES.encrypt(msg, key);
}

svkm.basic.executeWithUserKey = function (func) {
  chrome.runtime.sendMessage({eventName: "getKeyForUser", id:svkm.basic.getParameterByName("sel")},
    function(response) {
      if (response.result == "yes") {
        return func(response.key);
      }
    });
}

svkm.basic.sendMessage = function (text) {
    console.log('sendMessage: text = ' + text);
    var imEditable = document.getElementById(svkm.basic.getImEditableId());
    if(imEditable == null) {
        return false;
    }

    svkm.basic.executeWithUserKey(function(key) {
      imEditable.textContent = svkm.crypto.encrypt(text, key);
      document.getElementById("im_send").dispatchEvent(new Event("click"));
    });

    return true;
}

svkm.basic.hideVkEditable = function (){
  // Disable standard vk ui
  var vk_im_editable = getImEditable();
  vk_im_editable.style.display = "none";

  var vk_send_wrap = document.getElementById("im_send_wrap");
  vk_send_wrap.style.display = "none";

  var vk_im_texts = document.getElementById("im_texts");
  vk_im_texts.style.display = "none";

  im_editable = vk_im_editable;
}

svkm.basic.getVkWriteForm = function () {
    return document.getElementById("im_write_form");
}
svkm.basic.showVkSecurityWarningBox = function () {
    var vk_im_write_form = svkm.basic.getVkWriteForm();
    vk_im_write_form.className = "unsecure-form";
    div = document.createElement('div');
    div.innerHTML = "Внимание! Шифрование переписки не ведется";
    div.id = "security-status-label";
    div.className = "security-status-label";
    vk_im_write_form.insertBefore(div, vk_im_write_form.firstChild);
}

svkm.basic.hideVkSecurityWarningBox = function () {
    var vk_im_write_form = svkm.basic.getVkWriteForm();
    vk_im_write_form.className = "";
    var warningBox = document.getElementById("security-status-label");
    if (warningBox) {
        warningBox.parentNode.removeChild(warningBox);
    }
}

svkm.basic.restoreVkImEditable = function () {
  // Restore standard vk ui
  svkm.basic.hideSecureUi();
  svkm.basic.hideVkSecurityWarningBox();
  var vk_send_wrap = document.getElementById("im_send_wrap");
  vk_send_wrap.style.display = "";

  var vk_im_texts = document.getElementById("im_texts");
  vk_im_texts.style.display = "";

  svkm.basic.showVkSecurityWarningBox();
}

svkm.basic.hideSecureUi = function () {
  var iframe_el = document.getElementById("svkm_secure_iframe");
  if (iframe_el != null) {
    iframe_el.remove();
  }
}

svkm.basic.exchangeKeys = function () {
  console.log("Keys exchanged");
  chrome.runtime.sendMessage({eventName: "getMyKey"},
    function(response) {
      svkm.basic.sendMessage(MESSAGE_TAG_KEY_EXCHANGE_INIT + response.key);
    });
}

svkm.basic.getExchangeKeysButton = function (iframe) {
  return iframe.contentWindow.document.getElementById("svkm_exchange_keys_button");
}

/**
 * Function replaces vk message editable with secure input field inside an iframe
 */
svkm.basic.replaceVkImEditable = function () {
  svkm.basic.hideVkSecurityWarningBox();

  // Disable standard vk ui
  var vk_im_editable = svkm.basic.getImEditable();
  if(vk_im_editable != null) {
    vk_im_editable.style.display = "none";
  }

  var vk_send_wrap = document.getElementById("im_send_wrap");
  if(vk_send_wrap != null) {
    vk_send_wrap.style.display = "none";
  }

  var vk_im_texts = document.getElementById("im_texts");
  if(vk_im_texts != null) {
    vk_im_texts.style.display = "none";
  }

  // Create our secure ui
  // Delete ui that can be there for mid
  var iframe_el = document.getElementById("svkm_secure_iframe");
  if (iframe_el != null) {
    iframe_el.remove();
  }

  var div = document.createElement('div');
  div.id = 'svkm_secure_div';

  var iframe = document.createElement("iframe");
  iframe.id = "svkm_secure_iframe";
  iframe.frameBorder = false;

  div.appendChild(iframe);
  iframe.setAttribute("src", chrome.extension.getURL('frame.html'));
  iframe.onload = function () {
    iframe.contentWindow.document.getElementById("svkm_send_button")
      .addEventListener("click", onSendButtonClick);
    chrome.runtime.sendMessage({eventName: "getKeyForUser", id:svkm.basic.getParameterByName("sel")},
      function(response) {
        if (response.result == "no") {
          svkm.basic.getExchangeKeysButton(iframe).disabled = false;
          svkm.basic.getExchangeKeysButton(iframe).onclick = svkm.basic.exchangeKeys;
        } else {
          svkm.basic.getExchangeKeysButton(iframe).disabled = true;
        }
      });
  };
  //var im_wrap = document.getElementById("im_peer_controls_wrap");
  var im_write_form = document.getElementById("im_write_form");
  im_write_form.insertBefore(div, im_write_form.firstChild);
}