# tiny-reservoir-sample

One-pass uniform sampling from streams of any size, using Algorithm R.

## Usage

```js
import { ReservoirSampler, reservoirSample } from 'tiny-reservoir-sample';

// For streams you can hold in memory:
const sample = reservoirSample([1, 2, 3, 4, 5, 6, 7, 8], 3);

// For streams you cannot — offer items one at a time:
const sampler = new ReservoirSampler(3);
for (const item of [1, 2, 3, 4, 5, 6, 7, 8]) {
  sampler.offer(item);
}
const result = sampler.sample();
console.log(sampler.count()); // total items seen
```

Both `ReservoirSampler` and `reservoirSample` accept an optional `rng`
function returning a float in `[0, 1)`:

```js
const sampler = new ReservoirSampler(3, mySeededRng);
```

## Why

Reservoir sampling solves a specific problem: drawing `k` uniformly random
items from a stream whose length is unknown in advance, in a single pass,
without holding the stream in memory. The straightforward approach — collect
everything, then sample at the end — fails on large or unbounded streams.
Algorithm R needs only `O(k)` memory.

The trade-off: the sample is only uniform once the stream has been fully
consumed. If you call `sample()` mid-stream, the result reflects partial state,
not a uniform draw from the prefix.

## Edge cases

- `k = 0` is valid and produces an empty sample; `count()` still tracks
  offers.
- If the stream has fewer than `k` items, `sample()` returns exactly those
  items in stream order — no padding with `undefined`, because `undefined`
is a legitimate stream value in JavaScript and padding would be ambiguous.
- `sample()` returns a shallow copy; mutating it does not affect the sampler.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

