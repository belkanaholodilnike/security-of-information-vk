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
    if (callback) {
      callback();
    }
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

svkm.basic.executeWithMyKeyAndGenerateKeyIfNoKeyComputed = function(callback) {
  var removeMsgCallback = svkm.ui.showInfoMessageWithSpinner("Подождите, идет генерация ключа...");
  setTimeout(function() {
    svkm.basic.executeWithMyKey(function (myKey) {
      if (!myKey) {
        myKey = svkm.crypto.elgamal.generateKeyPair();
        chrome.runtime.sendMessage({eventName: "insertMyKey", key: myKey},
          function (response) {
          });
        removeMsgCallback();
      } else {
        removeMsgCallback();
      }
      callback(myKey);
    }, 0);
  });
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
          var closeHandler = svkm.ui.showInfoMessageWithSpinner("Подождите, пока сообщение расшифровывается...");
          setTimeout(function() {
            if (msgPreprocessed.direction == 'in') {
              decryptedText = svkm.crypto.elgamal.decryptReceived(msgCrypted, myKey);
            } else {
              decryptedText = svkm.crypto.elgamal.decryptSended(msgCrypted, myKey);
            }
            closeHandler();
            svkm.ui.showInfoMessage("Готово!", 1000);
            msgElement.textContent = decryptedText;
            $(msgElement).removeClass("encrypted-message");
            $(msgElement).addClass("secure-message");
          }, 0);
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
          svkm.basic.doWhenCanGenerateKey(
            svkm.basic.executeWithMyKeyAndGenerateKeyIfNoKeyComputed(function(myKey) {
              if (!myKey) {
                return;
              }
              var myKeyString = JSON.stringify(myKey['pubKey']);
              svkm.basic.sendMessageUnencrypted(MESSAGE_TAG_KEY_RESPONSE + myKeyString);
              svkm.ui.showInfoMessage("Ключ был послан собеседнику", 3000);
            }));
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
            svkm.ui.enableSendingAndShowHashesButton(svkm.ui.getSecureIframe());
          });
        console.log("Received key " + JSON.stringify(key) + " for user " + userId);
      }
    }
  } else {
    // nothing
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
    $(msgElement).removeClass('unsecure-message');
    $(msgElement).addClass('encrypted-message');
    msgElement.textContent = '*encrypted*';
    msgElement.onclick = function() {
      var msgCrypted = messageEntry.text;
      svkm.basic.executeWithMyKey(function (myKey) {
        if (!myKey) {
          console.log("Couldn't decrypt message, since my private key is not yet generated");
          return;
        }
        var decryptedText = null;
        var closeHandler = svkm.ui.showInfoMessageWithSpinner("Подождите, пока сообщение расшифровывается...");
        if (messageEntry.direction == 'in') {
          decryptedText = svkm.crypto.elgamal.decryptReceived(msgCrypted, myKey);
        } else {
          decryptedText = svkm.crypto.elgamal.decryptSended(msgCrypted, myKey);
        }
        closeHandler();
        svkm.ui.showInfoMessage("Готово!", 1000);
        msgElement.textContent = decryptedText;
        $(msgElement).removeClass("encrypted-message");
        $(msgElement).addClass("secure-message");
      });
    }

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
  } else {
    messageEntry.type = 'unencrypted';
    $(msgElement).addClass('unsecure-message');
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

  var shouldUseSecureForm = true;
  if (!(svkm.basic.isPersonalChatImEditableId(imEditableId)) ||
    !svkm.basic.isSecureFormEnabled()) {
    shouldUseSecureForm = false;
  }

  if (shouldUseSecureForm) {
    preprocessedMsgs = {};
    svkm.basic.replaceVkImEditable();
    svkm.basic.preprocessMessages();
    var msgIds = Object.keys(preprocessedMsgs);
    if (msgIds.length > 0)
      lastProcessedMsgId = Array.max(msgIds);
    else
      lastProcessedMsgId = null;

    svkm.basic.registerForNewMessageCallback(function(msgElement) {
      var msgId = svkm.basic.getMessageId(msgElement);
      if (preprocessedMsgs[msgId])
        return;
      svkm.basic.preprocessMessage(msgElement);
      svkm.basic.processMessage(msgElement);
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
        svkm.basic.executeWithMyKeyAndGenerateKeyIfNoKeyComputed(function (myKey) {
          var closeHandler = svkm.ui.showInfoMessageWithSpinner("Подождите, пока сообщение шифруется...");
          setTimeout(function() {
            var encryptedText = svkm.crypto.elgamal.encrypt(text, publicKey, myKey);
            closeHandler();
            svkm.ui.showInfoMessage("Готово!", 1000);
            imEditable.textContent = MESSAGE_TAG_ENCRYPTED + encryptedText;
            nextMessageFromMeNeedToDecrypt = true;
            document.getElementById("im_send").dispatchEvent(new Event("click"));
          }, 0);
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

  var vk_im_editable = svkm.basic.getImEditable();
  if(vk_im_editable != null) {
    vk_im_editable.style.display = "";
  }

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

svkm.basic.showKeysHashes = function () {
  svkm.basic.executeWithMyKey(function(myKey) {
    svkm.basic.executeWithUserPublicKey(function(userPubKey) {
      var myHash = '---';
      if (myKey !== null) {
        var a = myKey['pubKey'][0].toString();
        var b = myKey['pubKey'][1].toString();
        var c = myKey['pubKey'][2].toString();
        myHash = CryptoJS.SHA3(a + b + c).toString(CryptoJS.enc.Base64);
      }
      var userHash = '---';
      if (userPubKey !== null) {
        var a = userPubKey[0].toString();
        var b = userPubKey[1].toString();
        var c = userPubKey[2].toString();
        userHash = CryptoJS.SHA3(a + b + c).toString(CryptoJS.enc.Base64);
      }

      var msg = "Чтобы проверить, что ключ вашего собеседника не был подменен," +
        " свяжитесь с ним по защищенному каналу связи (например, встретьтесь вживую) и сравните" +
        " приведенные ниже хэши от открытых ключей.\n\n" +
        "Мой хэш: \n\t" + myHash + "\n\n" + "Хэш собеседника: \n\t" + userHash;
      alert(msg);
    });
  });
}

svkm.basic.getExchangeKeysButton = function (iframe) {
  return iframe.contentWindow.document.getElementById("svkm_exchange_keys_button");
}

svkm.basic.getShowKeyHashesButton = function (iframe) {
  return iframe.contentWindow.document.getElementById("svkm_show_keys_hashes_button");
}

svkm.basic.getSecureTextarea = function (iframe) {
  return iframe.contentWindow.document.getElementById("svkm_message");
}

svkm.basic.getSendMessageButton = function(iframe) {
  return iframe.contentWindow.document.getElementById("svkm_send_button");
}

svkm.basic.getSendMessageTextarea = function(iframe) {
  return iframe.contentWindow.document.getElementById("svkm_message");
}

svkm.ui.disableSendingAndShowHashesButton = function (iframe) {
  svkm.basic.getSendMessageButton(iframe).disabled = true;
  svkm.basic.getShowKeyHashesButton(iframe).disabled = true;
};

svkm.ui.enableSendingAndShowHashesButton = function (iframe) {
  svkm.basic.getSendMessageButton(iframe).disabled = false;
  svkm.basic.getShowKeyHashesButton(iframe).disabled = false;
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
    svkm.basic.getShowKeyHashesButton(iframe).addEventListener("click", svkm.basic.showKeysHashes);
    svkm.basic.getExchangeKeysButton(iframe).addEventListener("click", svkm.basic.exchangeKeys);
    var textarea = svkm.basic.getSecureTextarea(iframe);
    $(textarea).keypress(function(event) {
      var keyCode = event.keyCode;
      if ((keyCode == 10 || keyCode == 13) && (event.ctrlKey || event.metaKey)) {
        var text = textarea.textContent;
        svkm.basic.sendMessage(text);
        textarea.textContent = '';
      }
    });
    chrome.runtime.sendMessage({eventName: "getPublicKeyForUser", id:svkm.basic.getParameterByName("sel")},
      function(response) {
        console.log("Public key for user " + svkm.basic.getParameterByName("sel") + " is " + response);
        if (response.result == "no") {
          svkm.ui.disableSendingAndShowHashesButton(iframe);
        } else {
          svkm.ui.enableSendingAndShowHashesButton(iframe);
        }
      });
  };
  //var im_wrap = document.getElementById("im_peer_controls_wrap");
  var im_write_form = document.getElementById("im_write_form");
  im_write_form.insertBefore(div, im_write_form.firstChild);
}