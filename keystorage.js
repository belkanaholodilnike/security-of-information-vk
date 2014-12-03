
svkm = function() {

}
svkm.keystorage = function() {

}

var KEYSTORAGE_KEY = 'keystorage';

svkm.keystorage.getKeystorage = function() {
  if (localStorage.getItem(KEYSTORAGE_KEY) === null) {
    svkm.keystorage.saveKeystorage({});
  }
  return JSON.parse(localStorage.getItem(KEYSTORAGE_KEY));
}

svkm.keystorage.saveKeystorage = function(keys) {
  localStorage.setItem(KEYSTORAGE_KEY, JSON.stringify(keys));
}

svkm.keystorage.withKeyForUser = function(id, callback) {
  var keys = svkm.keystorage.getKeystorage();
  if (keys[id])
    callback(keys[id]);
  else
    callback(null);
}

svkm.keystorage.insertKeyForUser = function (userId, key) {
  var keys = svkm.keystorage.getKeystorage();
  keys[userId] = key;
  svkm.keystorage.saveKeystorage(keys);
}

svkm.keystorage.insertMyKey = function (key) {
  var keys = svkm.keystorage.getKeystorage();
  keys['myKey'] = key;
  svkm.keystorage.saveKeystorage(keys);
}

svkm.keystorage.hasMyKey = function() {
  var keys = svkm.keystorage.getKeystorage();
  if (!keys['myKey']) {
    return false;
  }
  return true;
}

svkm.keystorage.getMyKey = function() {
  console.log('KEYSTORAGE: ' + localStorage[KEYSTORAGE_KEY]);
  var keys = svkm.keystorage.getKeystorage();
  if (!keys['myKey']) {
    return null;
  }
  return keys['myKey'];
}