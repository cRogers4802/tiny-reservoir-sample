/**
 * Reservoir sampling (Algorithm R) for uniform one-pass sampling from a stream
 * of unknown length.
 *
 * The constructor accepts an optional rng function. If none is provided, we
 * use Math.random. Why expose the rng instead of hiding it behind Math.random?
 * Because deterministic tests are non-negotiable here: any behaviour that
 * depends on randomness must be testable with a controlled seed, otherwise
 * the test suite is a lottery. Passing a fake rng is the same pattern as
 * passing a fake clock.
 *
 * The internal state (the reservoir array) is kept as a property with an
 * underscore-prefixed name. There is no attempt at true encapsulation; this
 * is a small, focused library and the tests need to inspect state to verify
 * invariants. Hiding it behind a closure would force the tests to go through
 * the public API only, which would make some edge-case checks impossible.
 */
export class ReservoirSampler {
  /**
   * @param {number} k - Fixed sample size. Must be a non-negative integer.
   *   k = 0 is explicitly allowed and produces an empty sample.
   * @param {function(): number} [rng] - A function returning a float in
   *   [0, 1). Defaults to Math.random.
   */
  constructor(k, rng) {
    if (!Number.isInteger(k) || k < 0) {
      throw new TypeError('k must be a non-negative integer');
    }
    this._k = k;
    this._reservoir = new Array(k);
    this._seen = 0;
    this._rng = typeof rng === 'function' ? rng : Math.random;
  }

  /**
   * Offer one item to the sampler.
   *
   * @param {*} item
   * @returns {void}
   */
  offer(item) {
    const k = this._k;
    if (k === 0) {
      this._seen += 1;
      return;
    }
    const i = this._seen;
    this._seen += 1;
    if (i < k) {
      // Fill phase: the first k items are always retained. This is what
      // makes the algorithm work on streams smaller than k — the sample is
      // then the entire stream.
      this._reservoir[i] = item;
      return;
    }
    // Replacement phase: for the (n+1)-th item (n >= k here, since _seen was
    // incremented to i+1 and i >= k), draw j uniformly from [0, n] = [0, _seen-1].
    // We use _seen - 1 rather than _seen because _seen was just incremented.
    const j = Math.floor(this._rng() * this._seen);
    if (j < k) {
      this._reservoir[j] = item;
    }
    // When j >= k the item is discarded — this is the normal, common case
    // once the stream is longer than k.
  }

  /**
   * Offer many items at once. Equivalent to calling offer() in a loop but
   * more ergonomic for array inputs.
   *
   * @param {Iterable<*>} items
   * @returns {void}
   */
  offerMany(items) {
    for (const item of items) {
      this.offer(item);
    }
  }

  /**
   * Return the current sample. The returned array is a shallow copy so the
   * caller cannot mutate internal state.
   *
   * @returns {Array<*>}
   */
  sample() {
    if (this._seen < this._k) {
      // Stream is shorter than k: return only the items actually seen, in
      // stream order. Why stream order rather than the full reservoir padded
      // with undefined? Because undefined is a valid stream value in JS and
      // padding would be indistinguishable from a real offer(undefined).
      return this._reservoir.slice(0, this._seen);
    }
    return this._reservoir.slice();
  }

  /**
   * Number of items offered so far.
   *
   * @returns {number}
   */
  count() {
    return this._seen;
  }
}

/**
 * Functional convenience: sample exactly k items from a finite iterable in
 * one pass and return them. For truly unbounded streams use the class so you
 * can interleave offers with other work.
 *
 * @param {Iterable<*>} items
 * @param {number} k
 * @param {function(): number} [rng]
 * @returns {Array<*>}
 */
export function reservoirSample(items, k, rng) {
  const sampler = new ReservoirSampler(k, rng);
  sampler.offerMany(items);
  return sampler.sample();
}
