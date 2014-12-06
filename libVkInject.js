/**
 * Created by melges on 12.10.2014.
 */

var im_editable = null;

var preprocessedMsgs = {};
var lastProcessedMsgId = null;
var nextMessageFromMeNeedToDecrypt = false;

svkm.basic.executeWithUserPublicKey = function (func) {
  chrome.runtime.sendMessage({
      eventName: "getPublicKeyForUser",
      id:svkm.basic.getParameterByName("sel")},
    function(response) {
      var key = response.key;
      if (key) {
        key[0] = new Decimal(key[0]);
        key[1] = new Decimal(key[1]);
        key[2] = new Decimal(key[2]);
      }
      return func(key);
    });
}

svkm.basic.executeWithMyKey = function (func) {
  chrome.runtime.sendMessage({eventName: "getMyKey"},
    function (response) {
      var myKey = response.key;
      if (myKey) {
        myKey['pubKey'][0] = new Decimal(myKey['pubKey'][0]);
        myKey['pubKey'][1] = new Decimal(myKey['pubKey'][1]);
        myKey['pubKey'][2] = new Decimal(myKey['pubKey'][2]);
        myKey['priKey'] = new Decimal(myKey['priKey']);
      }
      func(myKey);
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
    svkm.basic.doForAllMessages(callback);
  });
};

svkm.basic.getMessageId = function (msgElement) {
  var id = msgElement.parentElement.parentElement.parentElement.id;
  return id;
};

svkm.basic.doWhenCanGenerateKey = function(callback) {
  var t = svkm.crypto.elgamal.isReadyToGenerateKeyPair();
  if (!t[0]) {
    var removeMsgCallback = svkm.ui.showInfoMessageWithSpinner("Не хватает случайных данных для генерации ключа, " +
      "продолжайте двигать курсором (" + Math.round(t[1]) + "%)");
    console.log("Ready to generate key? NO");
    setTimeout(function() {
      removeMsgCallback();
      svkm.basic.doWhenCanGenerateKey(callback);
    }, 500);
  } else {
    console.log("Ready to generate key? YES!");
    callback();
  }
}

svkm.basic.doWhenCanEncryptMessage = function(callback) {
  var t = svkm.crypto.elgamal.isReadyToEncryptMessage();
  if (!t[0]) {
    var removeMsgCallback = svkm.ui.showInfoMessageWithSpinner("Не хватает случайных данных для шифрования сообщения, " +
      "продолжайте двигать курсором (" + Math.round(t[1]) + "%)");
    console.log("Ready to encrypt message? NO");
    setTimeout(function() {
      removeMsgCallback();
      svkm.basic.doWhenCanEncryptMessage(callback);
    }, 500);
  } else {
    console.log("Ready to encrypt message? YES!");
    callback();
  }
}

function hideMessageElement(msgElement) {
  msgElement.parentElement.parentElement.parentElement.style.display = 'none';
}

function getMessageDirection(msgElement) {
  var className = msgElement.parentElement.parentElement.parentElement.className;
  if (className.match(/im_in/g))
    return 'in';
  if (className.match(/im_out/g))
    return 'out';
  return null;
}

svkm.basic.processMessage = function (msgElement) {
  function isMessageNew(msgId) {
    return (lastProcessedMsgId == null || lastProcessedMsgId < msgId);
  }

  var msgId = svkm.basic.getMessageId(msgElement);
  var msgPreprocessed = preprocessedMsgs[msgId];

  if (msgPreprocessed.type == MESSAGE_TAG_ENCRYPTED) {
    if (isMessageNew(msgId) ||
      (msgPreprocessed.direction == 'out' && nextMessageFromMeNeedToDecrypt)) {
        var msgCrypted = msgPreprocessed.text;
        svkm.basic.executeWithMyKey(function (myKey) {
          if (!myKey) {
            console.log("Couldn't decrypt message, since my private key is not yet generated");
            return;
          }
          var decryptedText = null;
          if (msgPreprocessed.direction == 'in') {
            decryptedText = svkm.crypto.elgamal.decryptReceived(msgCrypted, myKey);
          } else {
            decryptedText = svkm.crypto.elgamal.decryptSended(msgCrypted, myKey);
          }
          msgElement.textContent = decryptedText;
        });
      }
    
      if (nextMessageFromMeNeedToDecrypt) {
        nextMessageFromMeNeedToDecrypt = false;
      }
  } else if (msgPreprocessed.type == MESSAGE_TAG_KEY_REQUEST) {
    if (msgPreprocessed.direction == 'out') {
      console.log("ignoring my own key request message");
    } else {
      if (isMessageNew(msgId)) {
        if (confirm('Собеседник запросил ваш открытый ключ, что позволит ему шифровать сообщения, посылаемые вам. ' +
          'Разрешить передачу ключа?')) {
          svkm.basic.doWhenCanGenerateKey(function () {
            var removeMsgCallback = svkm.ui.showInfoMessageWithSpinner("Подождите, идет генерация ключа...");
            svkm.basic.executeWithMyKey(function (myKey) {
              if (!myKey) {
                myKey = svkm.crypto.elgamal.generateKeyPair();
                removeMsgCallback();
                svkm.ui.showInfoMessage("Готово!", 3000);
                chrome.runtime.sendMessage({eventName: "insertMyKey", key: myKey},
                  function (response) {
                  });
              }
              var myKeyString = JSON.stringify(myKey['pubKey']);
              svkm.basic.sendMessageUnencrypted(MESSAGE_TAG_KEY_RESPONSE + myKeyString);
              svkm.ui.showInfoMessage("Ключ был послан собеседнику", 3000)
            });
          });
        } else {
          svkm.basic.sendMessageUnencrypted(MESSAGE_TAG_KEY_REFUSE);
        }
      }
    }
  } else if (msgPreprocessed.type == MESSAGE_TAG_KEY_REFUSE) {
    if (msgPreprocessed.direction == 'out') {
      console.log("ignoring my own refuse message");
    } else {
      if (isMessageNew(msgId)) {
        alert("Собеседник отказался пересылать вам свой открытый ключ. Пока ваш собеседник не перешлет вам открытый " +
          "ключ, вы не сможете вести зашифрованную переписку.");
      }
    }

  } else if (msgPreprocessed.type == MESSAGE_TAG_KEY_RESPONSE) {
    if (msgPreprocessed.direction == 'out') {
      console.log("ignoring my own key response");
    } else {
      if (isMessageNew(msgId)) {
        var keyString = msgPreprocessed.text;
        var key = JSON.parse(keyString);
        var userId = svkm.basic.getParameterByName("sel");
        chrome.runtime.sendMessage({eventName: "insertKeyForUser", userId: userId, key: key},
          function (response) {
            svkm.ui.enableSendingButton(svkm.ui.getSecureIframe());
          });
        console.log("Received key " + JSON.stringify(key) + " for user " + userId);
      }
    }
  }

  if (lastProcessedMsgId == null || lastProcessedMsgId < msgId) {
    lastProcessedMsgId = msgId;
    console.log('LAST PROCESSED MSG: ' + lastProcessedMsgId);
  }
};

svkm.basic.preprocessMessage = function(msgElement) {
  var msgId = svkm.basic.getMessageId(msgElement);
  var msgText = msgElement.textContent;
  var messageEntry = {};

  messageEntry.direction = getMessageDirection(msgElement);
  if (msgText.lastIndexOf(MESSAGE_TAG_ENCRYPTED, 0) === 0) {
    messageEntry.type = MESSAGE_TAG_ENCRYPTED;
    messageEntry.text = msgText.substr(MESSAGE_TAG_ENCRYPTED.length);
    msgElement.textContent = '*encrypted*';
  } else if (msgText.lastIndexOf(MESSAGE_TAG_KEY_REFUSE, 0) === 0) {
    messageEntry.type = MESSAGE_TAG_KEY_REFUSE;
    hideMessageElement(msgElement);
  } else if (msgText.lastIndexOf(MESSAGE_TAG_KEY_REQUEST, 0) === 0) {
    messageEntry.type = MESSAGE_TAG_KEY_REQUEST;
    hideMessageElement(msgElement);
  } else if (msgText.lastIndexOf(MESSAGE_TAG_KEY_RESPONSE, 0) === 0) {
    messageEntry.type = MESSAGE_TAG_KEY_RESPONSE;
    messageEntry.text = msgText.substr(MESSAGE_TAG_KEY_RESPONSE.length);
    hideMessageElement(msgElement);
  }

  preprocessedMsgs[msgId] = messageEntry;
}

svkm.basic.preprocessMessages = function() {
  svkm.basic.doForAllMessages(function(msgElement) {
    svkm.basic.preprocessMessage(msgElement);
  });
}

Array.max = function( array ){
  if (array.length == 0)
    return null;
  var result = array[0];
  for (var i = 0; i < array.length; i++) {
    if (array[i] > result)
      result = array[i];
  }
  return result;
};

svkm.basic.urlChanged = function () {
    var imEditableId = svkm.basic.getImEditableId();
    if(imEditableId == null) {
        return null;
    }

    //var messageTextEdit = document.getElementById(imEditableId);
    //messageTextEdit.textContent = "Text injected " + imEditableId;

  if (svkm.basic.isPersonalChatImEditableId(imEditableId)) {
    preprocessedMsgs = {};
    svkm.basic.replaceVkImEditable();
    svkm.basic.preprocessMessages();
    var msgIds = Object.keys(preprocessedMsgs);
    if (msgIds.length > 0)
      lastProcessedMsgId = Array.max(msgIds);
    else
      lastProcessedMsgId = null;
    console.log('LAST PROCESSED MSG: ' + lastProcessedMsgId);
//    svkm.basic.doForAllMessages(function(msgElement) {
//      svkm.basic.processMsg(msgElement, false);
//      var msgId = svkm.basic.getMessageId(msgElement);
//      if (lastProcessedMsgId == null || lastProcessedMsgId < msgId)
//        lastProcessedMsgId = msgId;
//      preprocessedMsgs[msgId] = true;
//    });
    svkm.basic.registerForNewMessageCallback(function(msgElement) {
      var msgId = svkm.basic.getMessageId(msgElement);
      if (preprocessedMsgs[msgId])
        return;
      svkm.basic.preprocessMessage(msgElement);
      svkm.basic.processMessage(msgElement);
//      var msgId = svkm.basic.getMessageId(msgElement);
//      if (preprocessedMsgs[msgId])
//        return;
//      var newMsg = (lastProcessedMsgId == null || msgId > lastProcessedMsgId);
//      if (!newMsg)
//        return;
//      svkm.basic.processMsg(msgElement, true);
//      preprocessedMsgs[msgId] = true;
    });
  } else {
    svkm.basic.restoreVkImEditable();
  }
}

svkm.basic.sendMessage = function (text) {
    console.log('sendMessage: text = ' + text);
    var imEditable = document.getElementById(svkm.basic.getImEditableId());
    if(imEditable == null) {
        return false;
    }

    svkm.basic.doWhenCanEncryptMessage(function () {
      svkm.basic.executeWithUserPublicKey(function(publicKey) {
        svkm.basic.executeWithMyKey(function (myKey) {
          var encryptedText = svkm.crypto.elgamal.encrypt(text, publicKey, myKey);
          imEditable.textContent = MESSAGE_TAG_ENCRYPTED + encryptedText;
          nextMessageFromMeNeedToDecrypt = true;
          document.getElementById("im_send").dispatchEvent(new Event("click"));
        });
      });
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
  svkm.basic.sendMessageUnencrypted(MESSAGE_TAG_KEY_REQUEST);
}

svkm.basic.getExchangeKeysButton = function (iframe) {
  return iframe.contentWindow.document.getElementById("svkm_exchange_keys_button");
}

svkm.basic.getTestButton = function(iframe) {
  return iframe.contentWindow.document.getElementById("svkm_test_button");
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

svkm.ui.showInfoMessageWithSpinner = function(msg) {
  var document = getSecuredDocument();
  var msgDiv = document.createElement('div');
  msgDiv.className = 'svkm-info-msg-item';

  var imgElement = document.createElement('img');
  imgElement.setAttribute('src', 'images/ajax-loader.gif');
  msgDiv.appendChild(imgElement);

  var msgSpan = document.createElement('span');
  msgSpan.textContent = msg;
  msgDiv.appendChild(msgSpan);

  getSecuredDocument().getElementById("svkm-info").appendChild(msgDiv);

  return function() {
    msgDiv.parentNode.removeChild(msgDiv);
  };
}

svkm.ui.showInfoMessage = function(msg, timeoutMs) {
  var document = getSecuredDocument();
  var msgDiv = document.createElement('div');
  msgDiv.className = 'svkm-info-msg-item';

  var msgSpan = document.createElement('span');
  msgSpan.textContent = msg;
  msgDiv.appendChild(msgSpan);

  getSecuredDocument().getElementById("svkm-info").appendChild(msgDiv);

  setTimeout(function() {
    msgDiv.parentNode.removeChild(msgDiv);
  }, timeoutMs);
}

test = function() {
  svkm.crypto.math.random_test();
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
    svkm.basic.getTestButton(iframe).addEventListener("click", test);
    svkm.basic.getExchangeKeysButton(iframe).addEventListener("click", svkm.basic.exchangeKeys);
    chrome.runtime.sendMessage({eventName: "getPublicKeyForUser", id:svkm.basic.getParameterByName("sel")},
      function(response) {
        console.log("Public key for user " + svkm.basic.getParameterByName("sel") + " is " + response);
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