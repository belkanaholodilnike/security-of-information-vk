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
  if(svkm.crypto.math.isProbablePrime(new Decimal(text))) {
    svkm.basic.sendMessage("Проверка на прсототу числа " + text + '\n' + "Число вероятно простое");
  } else {
    svkm.basic.sendMessage("Проверка на прсототу числа " + text + '\n' + "Число составное");
  }

  var key = svkm.crypto.elgamal.generateKeyPair();
  if(key == null) {
    svkm.ui.showInfoMessage("Недостаточно данных для генерации ключа", 3000);
    svkm.ui.showInfoMessage("Подвигайте мышью по страницу", 3000);
  }
  svkm.ui.showInfoMessage(key['priKey'], 3000);

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
