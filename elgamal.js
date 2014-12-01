/**
 * Created by melges on 22.11.2014.
 */

svkm.crypto = function () {

}

svkm.crypto.math = function () {

}

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
}

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

  return result.modulo(t);
};

console.log(svkm.crypto.math.decompositionOnTwoPower(321));

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
      x = x.pow(2).modulo(n);
      if (x.equals(1))
        return false;
      if (x.equals(n.minus(1)))
        continue WitnessLoop;
    }

    return false;
  } while (--k);

  return true;
};

svkm.crypto.elgamal.generateKeyPair = function () {
  var randomSeq = random(2048);
};