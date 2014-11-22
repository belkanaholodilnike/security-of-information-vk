var mouseCoordBuffer = [];

/**
 * Listener which should be called when mouse coordinates is changed.
 */
function mouseMoved(docElement) {
  mouseCoordBuffer.push(docElement.pageX);
  mouseCoordBuffer.push(docElement.pageY);
}

/**
 * Function returns random string with specified number of bits characters
 * @param num number of bits which generated string casted to int must have.
 * @return string string or null if we couldn't generate string with
 * specified length.
 */
function random(num) {
  if(mouseCoordBuffer.length < num * (Math.floor(num / 512) + 1)) {
    return null;
  }

  // SHA-3 generate 512 bit num, we need to repeat hashing for generate several sequences
  var generatedString = "";
  for(var i = 0; i < Math.floor(num / 512) + 1; i++) {
    generatedString += CryptoJS.SHA3(mouseCoordBuffer.splice(0, num).toString())
        .toString(CryptoJS.enc.Hex);
  }

  return generatedString;
}


document.addEventListener("mousemove", mouseMoved);