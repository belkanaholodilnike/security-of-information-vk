var mouseCoordBuffer = new Array();

/**
 * Listener which should be called when mouse coordinates is changed.
 */
function mouseMoved(docElement) {
  mouseCoordBuffer.push(docElement.pageX);
  mouseCoordBuffer.push(docElement.pageY);
}

/**
 * Function returns random string with specifed number of characters
 * @param num number of characters which geerated string must have.
 * @return random string or null if we couldn't generate string with
 * specifed length.
 */
function random(num) {
  // TODO: Function body
}


document.addEventListener("mousemove", mouseMoved);