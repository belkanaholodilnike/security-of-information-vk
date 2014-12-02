/**
 * Created by melges on 12.10.2014.
 */

var im_editable = null;

svkm.basic.executeWithUserKey = function (func) {
  chrome.runtime.sendMessage({eventName: "getMyKey", id:svkm.basic.getParameterByName("sel")},
    function(response) {
      return func(response.key);
    });
}

svkm.basic.executeWithMyKey = function (func) {
  chrome.runtime.sendMessage({eventName: "getMyKey"},
    function(response) {
      if (response.result == "yes") {
        return func(response.key);
      }
    });
}

var MESSAGE_TAG_KEY_REQUEST = '__VKSEC:REQUEST_KEY';
var MESSAGE_TAG_KEY_RESPONSE = '__VKSEC:RESPONSE_KEY';
var MESSAGE_TAG_KEY_REFUSE = '__VKSEC:REFUSE_KEY';
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
};

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

svkm.basic.doForAllMessages = function (callback) {
  var msgs = document.getElementsByClassName("im_msg_text");
  for (var i = 0; i < msgs.length; i++) {
    callback(msgs[i]);
  }
};

svkm.basic.registerForNewMessageCallback = function (callback) {
  var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
      eventListenerSupported = window.addEventListener;

    return function(obj, callback){
      if( MutationObserver ){
        // define a new observer
        var obs = new MutationObserver(function(mutations, observer){
          if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
            callback();
        });
        // have the observer observe foo for changes in children
        obs.observe( obj, { childList:true, subtree:true });
      }
      else if( eventListenerSupported ){
        obj.addEventListener('DOMNodeInserted', callback, false);
        obj.addEventListener('DOMNodeRemoved', callback, false);
      }
    }
  })();

  observeDOM( document.getElementById('im_rows'), function() {
    console.log('dom changed');
    svkm.basic.doForAllMessages(callback);
  });
};

svkm.basic.getMessageId = function (msgElement) {
  var id = msgElement.parentElement.parentElement.parentElement.id;
  return id;
};

svkm.basic.processMsg = function (msgElement, newMsg) {
  var text = msgElement.textContent;

  function hideMessageElement(msgElement) {
    msgElement.parentElement.parentElement.parentElement.style.display = 'none';
  }

  // On encrypted message
  if (text.lastIndexOf(MESSAGE_TAG_ENCRYPTED, 0) === 0) {
    var msg = text.substr(MESSAGE_TAG_ENCRYPTED.length);
    svkm.basic.executeWithMyKey(function (myPrivateKey) {
      // TODO: decrypt message
      msgElement.textContent = CryptoJS.AES.decrypt(msg, myPrivateKey).toString(CryptoJS.enc.Utf8);
    });
  } else if (text.lastIndexOf(MESSAGE_TAG_KEY_RESPONSE, 0) === 0) {
    // On key response

    hideMessageElement(msgElement);
    if (newMsg) {
      var key = text.substr(MESSAGE_TAG_KEY_RESPONSE.length);
      var userId = svkm.basic.getParameterByName("sel");
      chrome.runtime.sendMessage({eventName: "insertKeyForUser", userId: userId, key: key},
        function (response) {
          svkm.ui.enableSendingButton(svkm.ui.getSecureIframe());
        });
      console.log("Received key " + key + " for user " + userId);
    }
  } else if (text.lastIndexOf(MESSAGE_TAG_KEY_REFUSE, 0) === 0) {
    // On key refusal

    hideMessageElement(msgElement);
    if (newMsg) {
      alert("Собеседник отказался пересылать вам свой открытый ключ. Пока ваш собеседник не перешлет вам открытый " +
        "ключ, вы не сможете вести зашифрованную переписку.");
    }
  } else if (text.lastIndexOf(MESSAGE_TAG_KEY_REQUEST, 0) === 0) {
    // On key request

    hideMessageElement(msgElement);
    if (newMsg) {
      if (confirm('Собеседник запросил ваш открытый ключ, что позволит ему шифровать сообщения, посылаемые вам. ' +
        'Разрешить передачу ключа?')) {
        svkm.basic.executeWithMyKey(function (myKey) {
          svkm.basic.sendMessageUnencrypted(MESSAGE_TAG_KEY_RESPONSE + myKey);
          console.log("Sent my public key to the partner");
        })
      } else {
        svkm.basic.sendMessageUnencrypted(MESSAGE_TAG_KEY_REFUSE);
      }
    }
  }
};

var lastProcessedMsgId = null;
var processedMsgs = {};

svkm.basic.urlChanged = function () {
    var imEditableId = svkm.basic.getImEditableId();
    if(imEditableId == null) {
        return null;
    }

    //var messageTextEdit = document.getElementById(imEditableId);
    //messageTextEdit.textContent = "Text injected " + imEditableId;

  if (svkm.basic.isPersonalChatImEditableId(imEditableId)) {
    lastProcessedMsgId = null;
    svkm.basic.replaceVkImEditable();
    svkm.basic.doForAllMessages(function(msgElement) {
      svkm.basic.processMsg(msgElement, false);
      var msgId = svkm.basic.getMessageId(msgElement);
      if (lastProcessedMsgId == null || lastProcessedMsgId < msgId)
        lastProcessedMsgId = msgId;
      processedMsgs[msgId] = true;
    });
    svkm.basic.registerForNewMessageCallback(function(msgElement) {
      var msgId = svkm.basic.getMessageId(msgElement);
      if (processedMsgs[msgId])
        return;
      var newMsg = (lastProcessedMsgId == null || msgId > lastProcessedMsgId);
      svkm.basic.processMsg(msgElement, newMsg);
      processedMsgs[msgId] = true;
    });
  } else {
    svkm.basic.restoreVkImEditable();
  }
}

svkm.crypto.encrypt = function (msg, key) {
  // TODO: encrypt message
  return MESSAGE_TAG_ENCRYPTED + CryptoJS.AES.encrypt(msg, key).toString();
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

svkm.basic.sendMessageUnencrypted = function (text) {
  console.log('sendMessage: text = ' + text);
  var imEditable = document.getElementById(svkm.basic.getImEditableId());
  if(imEditable == null) {
    return false;
  }
  imEditable.textContent = text;
  document.getElementById("im_send").dispatchEvent(new Event("click"));
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
      svkm.basic.sendMessageUnencrypted(MESSAGE_TAG_KEY_REQUEST + response.key);
    });
}

svkm.basic.getExchangeKeysButton = function (iframe) {
  return iframe.contentWindow.document.getElementById("svkm_exchange_keys_button");
}

svkm.basic.getSendMessageButton = function(iframe) {
  return iframe.contentWindow.document.getElementById("svkm_send_button");
}

svkm.ui.disableSendingButton = function (iframe) {
  svkm.basic.getSendMessageButton(iframe).disabled = true;
};

svkm.ui.enableSendingButton = function (iframe) {
  svkm.basic.getSendMessageButton(iframe).disabled = false;
};

svkm.ui.getSecureIframe = function() {
  return document.getElementById("svkm_secure_iframe");
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
  var iframe_el = svkm.ui.getSecureIframe();
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
    svkm.basic.getSendMessageButton(iframe).addEventListener("click", onSendButtonClick);
    svkm.basic.getExchangeKeysButton(iframe).addEventListener("click", svkm.basic.exchangeKeys);
    chrome.runtime.sendMessage({eventName: "getKeyForUser", id:svkm.basic.getParameterByName("sel")},
      function(response) {
        console.log(response);
        if (response.result == "no") {
          svkm.ui.disableSendingButton(iframe);
        } else {
          svkm.ui.enableSendingButton(iframe);
        }
      });
  };
  //var im_wrap = document.getElementById("im_peer_controls_wrap");
  var im_write_form = document.getElementById("im_write_form");
  im_write_form.insertBefore(div, im_write_form.firstChild);
}