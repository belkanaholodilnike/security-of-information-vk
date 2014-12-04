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

///**
// * Function returns random string with no less than specified number of bits (in base64 encoding)
// * @param num number of bits which generated string casted to int must have.
// * @return string string or null if we couldn't generate string with
// * specified length.
// */
//svkm.crypto.math.random = function (bitsNeeded) {
//  if(mouseCoordBuffer.length < bitsNeeded / 6) {
//    return null;
//  }
//
//  // SHA-3 generate 512 bit num, we need to repeat hashing for generate several sequences
//  var generatedString = "";
//  while (bitsNeeded > 0) {
//    var curBitsAdded = Math.min(512, bitsNeeded);
//    curBitsAdded += (6 - (curBitsAdded % 6));
//    var curCharsAdded = curBitsAdded / 6;
//    var hashString = CryptoJS.SHA3(mouseCoordBuffer.splice(0, curBitsAdded).toString())
//      .toString(CryptoJS.enc.Base64);
//    generatedString += hashString.substr(0, curCharsAdded);
//    bitsNeeded -= curBitsAdded;
//  }
//
//  return generatedString;
//};

svkm.crypto.math.random_test = function() {
  for (i = 6; i < 48; i += 6) {
    console.log("random(" + i + ") = " + svkm.crypto.math.randomNum(i).toString());
  }
}

svkm.crypto.math.isCanGenerate = function (num) {
  if(mouseCoordBuffer.length < num * (Math.floor(num / 512) + 1)) {
    return [false, 100.0 * mouseCoordBuffer.length / num * (Math.floor(num / 512) + 1)];
  }

  return [true, 100.0];
};

svkm.crypto.math.randomNum = function (bitsNeeded) {
  if(mouseCoordBuffer.length < bitsNeeded / 4) {
    return null;
  }

  // SHA-3 generate 512 bit num, we need to repeat hashing for generate several sequences
  var generatedString = "";
  for (var i = 0; i <= Math.floor(bitsNeeded / 512); ++i) {
    var hashString = CryptoJS.SHA3(mouseCoordBuffer.splice(0, 7).toString())
      .toString(CryptoJS.enc.Hex);
    generatedString += hashString;
  }

  generatedString = hashString.substr(0, (bitsNeeded / 4) + 1);
  return new Decimal(generatedString, 16);
};


document.addEventListener("mousemove", mouseMoved);