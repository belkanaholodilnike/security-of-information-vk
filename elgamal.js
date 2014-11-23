/**
 * Created by melges on 22.11.2014.
 */
function probablyPrime(n, k) {
  n = new Decimal(n);
  if(!(n instanceof Decimal)) {
    return false;
  }

  if (n.equals(2) || n.equals(3))
    return true;
  if (n.modulo(2) == 0 || n.lessThan(2))
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
    var x = Decimal.random().times(n.minus(3)).floor().plus(2).pow(d).mod(n);
    //var x = Math.pow(2 + Math.floor(Math.random() * (n - 3)), d) % n;

    if (x.equals(1) || x.equals(n.minus(1)))
      continue;

    for (var i = s - 1; i >= 0; --i) {
      x = x.toNearest(x).modulo(n);
      if (x.equals(1))
        return false;
      if (x.equals(n.minus(1)))
        continue WitnessLoop;
    }

    return false;
  } while (--k);

  return true;
}

svkm.crypto.basic.isProbablePrime = function (t) {
  var i, x = this.abs();
  if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
    for (i = 0; i < lowprimes.length; ++i)
      if (x[0] == lowprimes[i]) return true;
    return false;
  }
  if (x.isEven()) return false;
  i = 1;
  while (i < lowprimes.length) {
    var m = lowprimes[i],
        j = i + 1;
    while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
    m = x.modInt(m);
    while (i < j) if (m % lowprimes[i++] == 0) return false;
  }
  return x.millerRabin(t);
};

svkm.crypto.elgamal.generateKeyPair = function () {
  var randomSeq = random(2048);
};