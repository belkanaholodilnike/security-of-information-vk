
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

svkm.keystorage.getMyKey = function() {
  // TODO
  console.log('KEYSTORAGE: ' + localStorage[KEYSTORAGE_KEY]);
  return 'passphrase';
}