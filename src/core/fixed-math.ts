// Deterministic replacements for Math.exp/log/pow. They use only + - * / and Math.round,
// which IEEE 754 defines exactly, so every JS engine produces bit-identical results.

const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.90821492927058770002e-10;
const SQRT2 = 1.4142135623730951;
const EXP_MAX = 709.782712893384;
const EXP_MIN = -745.1332191019412;

/** 2^k by binary exponentiation of exact powers of two. */
function pow2(k: number): number {
  let result = 1;
  let base = k < 0 ? 0.5 : 2;
  for (let n = Math.abs(k); n > 0; n = Math.floor(n / 2)) {
    if (n % 2 === 1) result *= base;
    base *= base;
  }
  return result;
}

export function exp(x: number): number {
  if (Number.isNaN(x)) return Number.NaN;
  if (x > EXP_MAX) return Number.POSITIVE_INFINITY;
  if (x < EXP_MIN) return 0;
  const k = Math.round(x / (LN2_HI + LN2_LO));
  const r = x - k * LN2_HI - k * LN2_LO;
  // Taylor series of e^r for |r| <= ln2 / 2, evaluated with Horner's scheme.
  let sum = 1;
  for (let n = 20; n >= 1; n--) sum = 1 + (r / n) * sum;
  // Split the scaling so results near the subnormal range don't hit 2^k = 0 early.
  const half = Math.trunc(k / 2);
  return sum * pow2(half) * pow2(k - half);
}

const SCALE_STEPS = [256, 64, 16, 4, 1].map((bits) => ({
  bits,
  up: pow2(bits),
  down: pow2(-bits),
}));

export function log(x: number): number {
  if (Number.isNaN(x) || x < 0) return Number.NaN;
  if (x === 0) return Number.NEGATIVE_INFINITY;
  if (x === Number.POSITIVE_INFINITY) return x;
  // Normalise x = m * 2^e with m in [1, 2), then fold m into [sqrt(1/2), sqrt(2)].
  let m = x;
  let e = 0;
  for (const { bits, up, down } of SCALE_STEPS) {
    while (m >= up) {
      m *= down;
      e += bits;
    }
    while (m < 1 && m * up < 2) {
      m *= up;
      e -= bits;
    }
  }
  if (m > SQRT2) {
    m /= 2;
    e += 1;
  }
  // log(m) = 2 * atanh(s) with s = (m - 1) / (m + 1), |s| <= 0.1716.
  const s = (m - 1) / (m + 1);
  const s2 = s * s;
  let series = 0;
  for (let n = 29; n >= 1; n -= 2) series = 1 / n + s2 * series;
  return e * LN2_HI + (e * LN2_LO + 2 * s * series);
}

function powInt(x: number, n: number): number {
  let result = 1;
  let base = x;
  for (let k = Math.abs(n); k > 0; k = Math.floor(k / 2)) {
    if (k % 2 === 1) result *= base;
    base *= base;
  }
  return n < 0 ? 1 / result : result;
}

export function pow(x: number, y: number): number {
  if (Number.isInteger(y)) return powInt(x, y);
  if (x < 0) return Number.NaN;
  if (x === 0) return y > 0 ? 0 : Number.POSITIVE_INFINITY;
  return exp(y * log(x));
}

export function logistic(x: number): number {
  return 1 / (1 + exp(-x));
}
