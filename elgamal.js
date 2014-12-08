/**
 * Created by melges on 22.11.2014.
 */

generatedPrimeNumbers = {
  2048 : new Decimal("64634012142622014601429753377339903920888205339430968064260690855049310277735" +
  "781786394402823045826927377435921843796038988239118300981842190176304772896566241261754734601992183500395500779304" +
  "213592115276768135136553584437285239512323676188676952340941163291704072610085775151783082131617215104798247860771" +
  "043828666779336684841369949573129138989712352070652644116155611318662052385416920628300517185728354233451887207436" +
  "923714715196702304603291808807395226466574462454251369421640419450314203453862646939357085161313395870091994536705" +
  "997276431050332778874671087204270866459209290636957209904296387111707222119192461539"),
  1024: new Decimal("359538626972463181545861038157804946723595395788461314546860162315465351611001926265416954644815" +
  "072042240227759742786715317579537628833244985694861278948248755535786849730970552604439202492188238906165904170011" +
  "537676301364684925762947826221081654474326701021369172596479894491876959432609670712659248448275913"),
  8: new Decimal("353")};
//  new Decimal("268156158598851941991480499964116922549587316411847867554471228874435280601470939536037485963338068553" +
//  "80063716372972101707507765623893139892867298012168351")];

svkm.crypto.KEYSIZE = 8;

svkm.crypto.math.decompositionOnTwoPower = function (n) {
  var wn = new Decimal(n);
  var powers = [];
  var counter = 0;
  while(wn > 1) {
    if(wn.modulo(2) == 1)
      powers.push(counter);
    counter++;
    wn = wn.dividedBy(2).floor();
  }

  // Add last one bit
  powers.push(counter);

  return powers;
};

svkm.crypto.math.powByMod = function (x, y, t) {
  var powers = svkm.crypto.math.decompositionOnTwoPower(y);
  console.log("powByMod(" + x + "," + y + "," + t + ")");
  console.log("len of powers[]: " + powers.length);

  var cache = [];
  // Calculate cache
  var maxPower = powers[powers.length - 1];
  var tmpResult = new Decimal(x);
  cache[0] = tmpResult.modulo(t);
  for(var i = 1; i <= maxPower; i++) {
    tmpResult = tmpResult.pow(2);
    tmpResult = tmpResult.modulo(t);
    cache[i] = tmpResult;
  }

  var result = new Decimal(1);
  for(var key = powers.length - 1; key >=0; key--) {
    result = result.times(cache[powers[key]]);
    result = result.modulo(t);
  }

  return result;
};

svkm.crypto.math.isProbablePrime = function (n, k) {
  n = new Decimal(n);
  if(!(n instanceof Decimal)) {
    return false;
  }

  if (n.equals(2) || n.equals(3))
    return true;
  if (n.modulo(2).equals(0) || n.lessThan(2))
    return false;

  // Write (n - 1) as 2^s * d
  var s = 0, d = n.minus(1);
  while (d.modulo(2).equals(0)) {
    d = d.dividedBy(2);
    ++s;
  }

  WitnessLoop: do {
    // A base between 2 and n - 2
    //var x = Decimal.random().toNearest(n.minus(3)).floor().plus(2).toPower(d).modulo(n);
    var x = Decimal.random();
    x = x.times(n.minus(3));
    x = x.floor();
    x = x.plus(2);
    x = svkm.crypto.math.powByMod(x, d, n);
    //var x = Math.pow(2 + Math.floor(Math.random() * (n - 3)), d) % n;

    if (x.equals(1) || x.equals(n.minus(1)))
      continue;

    for (var i = s - 1; i >= 0; --i) {
      x = svkm.crypto.math.powByMod(x, new Decimal(2), n);
      if (x.equals(1))
        return false;
      if (x.equals(n.minus(1)))
        continue WitnessLoop;
    }

    return false;
  } while (--k);

  return true;
};

svkm.crypto.elgamal.isReadyToGenerateKeyPair = function() {
  return svkm.crypto.math.isCanGenerate(7 * 10);
};

svkm.crypto.elgamal.isReadyToEncryptMessage = function() {
  return svkm.crypto.math.isCanGenerate(7 * 10);
};

svkm.crypto.elgamal.generateKeyPair = function () {
  var p = generatedPrimeNumbers[svkm.crypto.KEYSIZE];
  var g = svkm.crypto.math.randomNum(svkm.crypto.KEYSIZE);
  if(g == null)
    return null;
  var x = svkm.crypto.math.randomNum(svkm.crypto.KEYSIZE);
  if(x == null)
    return null;
  var y = svkm.crypto.math.powByMod(g, x, p);

  var toReturn = {};
  toReturn['pubKey'] = [p, g, y];
  toReturn['priKey'] = x;

  return toReturn;
};

svkm.crypto.elgamal.encrypt = function (text, pubKey, myKey) {
  if(myKey == null)
    return null;
  if(pubKey == null)
    return null;

  var aesKey = svkm.crypto.math.randomNum(svkm.crypto.KEYSIZE);
  if(aesKey == null)
    return null;

  console.log("encrypt: aesKey = " + aesKey.toString());

  var elGamalSessionKey = svkm.crypto.math.randomNum(svkm.crypto.KEYSIZE);
  if(elGamalSessionKey == null)
    return null;

  var a = svkm.crypto.math.powByMod(pubKey[1], elGamalSessionKey, pubKey[0]);
  var b = svkm.crypto.math.powByMod(pubKey[2], elGamalSessionKey, pubKey[0]).times(aesKey.modulo(pubKey[0]));

  var aMy = svkm.crypto.math.powByMod(myKey['pubKey'][1], elGamalSessionKey, myKey['pubKey'][0]);
  var bMy = svkm.crypto.math.powByMod(myKey['pubKey'][2], elGamalSessionKey, myKey['pubKey'][0])
      .times(aesKey.modulo(myKey['pubKey'][0]));

  var aesEncrypted = CryptoJS.AES.encrypt(text, aesKey.toString());

  return a.toString() + ";" + b.toString() + ";" +
      aMy.toString() + ";" + bMy.toString() + ";" + aesEncrypted;
};

svkm.crypto.elgamal.decrypt = function (a, b, text, myKey) {
  if (typeof(a) != Decimal) {
    a = new Decimal(a);
  }
  if (typeof(b) != Decimal) {
    b = new Decimal(b);
  }

  var p = myKey['pubKey'][0];
  var x = myKey['priKey'];

  // (a^(p-1-x) mod p) * (b mod p)
  var aesKey = svkm.crypto.math.powByMod(a, p.minus(1).minus(x), p)
    .times(b.modulo(p)).modulo(p);

  console.log("decrypt: aesKey = " + aesKey.toString());

  return CryptoJS.AES.decrypt(text, aesKey.toString()).toString(CryptoJS.enc.Utf8);
};

svkm.crypto.elgamal.decryptReceived = function (text, myKey) {
  var textParts = text.split(";");
  var a = new Decimal(textParts[0]);
  var b = new Decimal(textParts[1]);

  return svkm.crypto.elgamal.decrypt(a, b, textParts[4], myKey);
};

svkm.crypto.elgamal.decryptSended = function (text, myKey) {
  var textParts = text.split(";");
  var a = new Decimal(textParts[2]);
  var b = new Decimal(textParts[3]);

  return svkm.crypto.elgamal.decrypt(a, b, textParts[4], myKey);
};