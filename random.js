var mouseCoordBuffer = [];

var LIMIT_BUFFER_LENGTH = 1000000;

/**
 * Listener which should be called when mouse coordinates is changed.
 */
function mouseMoved(docElement) {
  if (mouseCoordBuffer.length < LIMIT_BUFFER_LENGTH) {
    mouseCoordBuffer.push(docElement.pageX);
    mouseCoordBuffer.push(docElement.pageY);
  }
}

/**
 * Function returns random string with specified number of bits characters
 * @param num number of bits which generated string casted to int must have.
 * @return string string or null if we couldn't generate string with
 * specified length.
 */
svkm.crypto.math.random = function (num) {
  if(mouseCoordBuffer.length < num * (Math.floor(num / 512) + 1)) {
    return null;
  }

  // SHA-3 generate 512 bit num, we need to repeat hashing for generate several sequences
  var generatedString = "123";
  for(var i = 0; i < Math.floor(num / 512) + 1; i++) {
    //generatedString += CryptoJS.SHA3(mouseCoordBuffer.splice(0, num).toString())
      //  .toString(CryptoJS.enc.Base64);
  }

  return generatedString;
};

svkm.crypto.math.isCanGenerate = function (num) {
  if(mouseCoordBuffer.length < num * (Math.floor(num / 512) + 1)) {
    return [false, 100.0 * mouseCoordBuffer.length / num * (Math.floor(num / 512) + 1)];
  }

  return [true, 100.0];
};

svkm.crypto.math.randomNum = function (num) {
  if(mouseCoordBuffer.length < num * (Math.floor(num / 512) + 1)) {
    return null;
  }

  // SHA-3 generate 512 bit num, we need to repeat hashing for generate several sequences
  var generatedString = "123";
  for(var i = 0; i < Math.floor(num / 512) + 1; i++) {
//    generatedString += CryptoJS.SHA3(mouseCoordBuffer.splice(0, num).toString())
//        .toString(CryptoJS.enc.Hex);
  }

  return new Decimal(generatedString, 16);
};


document.addEventListener("mousemove", mouseMoved);