/**
 * Created by dmitry on 10/13/14.
 */

function onSendButtonClick() {
    sendMessage("Hi, test!");
}

document.getElementById("send").addEventListener("click", onSendButtonClick);
var svkm_message = document.getElementById("svkm_message");
svkm_message.resizable = false;