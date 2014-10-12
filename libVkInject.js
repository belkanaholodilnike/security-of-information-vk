/**
 * Created by melges on 12.10.2014.
 */

/**
 * Function parse page url and return value of specified parameter.
 * @param name parameter name (key)
 * @returns {string} value of parameter with specified name.
 */
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/**
 * Function generate id of messages editable form.
 * @returns {string} name of messages editable form.
 */
function getImEditableId() {
    // sel is some magic number which is associated with recipient
    // It would added in editable id
    var sel = getParameterByName("sel");
    if (sel == null) {
        return null;
    }

    return "im_editable" + sel;
}

function getImEditable() {
    return document.getElementById(getImEditableId());
}

function urlChanged() {
    var imEditableId = getImEditableId();
    if(imEditableId == null) {
        return null;
    }

    var messageTextEdit = document.getElementById(imEditableId);
    messageTextEdit.textContent = "Text injected " + imEditableId;

    replaceImEditable();
}

function sendMessage(text) {
    var imEditable = document.getElementById(getImEditableId());
    if(imEditable == null) {
        return false;
    }

    imEditable.textContent = text;
    document.getElementById("im_send").dispatchEvent(new Event("click"));

    return true;
}

/**
 * Function replace vk message editable on self created text editable (it is needed)
 * for secure inputed text to be leaked to vk servers.
 */
function replaceImEditable() {
    var nativeEditable = getImEditable();
    nativeEditable.style["display"] = "none";
}