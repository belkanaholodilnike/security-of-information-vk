svkm = function () {};
svkm.basic = function () {};
svkm.ui = function () {};
svkm.crypto = function () {};
svkm.crypto.math = function () {};
svkm.crypto.elgamal = function() {};


Decimal.config({ precision: 840 });

var IS_ENABLED_KEY = "is_enabled";
svkm.basic.isSecureFormEnabled = function() {
  if (localStorage.getItem(IS_ENABLED_KEY) === null) {
    localStorage.setItem(IS_ENABLED_KEY, 'true');
  }
  return localStorage.getItem(IS_ENABLED_KEY) == 'true';
}