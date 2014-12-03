/**
 * Created by melges on 22.11.2014.
 */

generatedPrimeNumbers = [new Decimal("64634012142622014601429753377339903920888205339430968064260690855049310277735" +
  "781786394402823045826927377435921843796038988239118300981842190176304772896566241261754734601992183500395500779304" +
  "213592115276768135136553584437285239512323676188676952340941163291704072610085775151783082131617215104798247860771" +
  "043828666779336684841369949573129138989712352070652644116155611318662052385416920628300517185728354233451887207436" +
  "923714715196702304603291808807395226466574462454251369421640419450314203453862646939357085161313395870091994536705" +
  "997276431050332778874671087204270866459209290636957209904296387111707222119192461539"),
  new Decimal('134078079299425970995740249982058461274793658205923933777235614437217640300735469768018742981669034276' +
  '90031858186486050853753882811946569946433649006084171')];

svkm.crypto.KEYSIZE = 64;

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

  var result = new Decimal(1);
  for(var key in powers) {
    var tmpResult = new Decimal(x);
    for(var i = 0; i < powers[key]; i++) {
      tmpResult = tmpResult.pow(2);
      tmpResult = tmpResult.modulo(t);
    }

    result = result.times(tmpResult);
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
  return svkm.crypto.math.isCanGenerate(2 * svkm.crypto.KEYSIZE);
}

svkm.crypto.elgamal.generateKeyPair = function () {
  if(!svkm.crypto.elgamal.isReadyToGenerateKeyPair()[0])
    return null;
  var p = generatedPrimeNumbers[1];
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