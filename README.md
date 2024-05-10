yaimc
---
Yet Another In-Memory Cache

why?
---
I wanted a simple in-memory cache with an api similar to
what I'm using in dotnet. I wrote this from scratch in
[zarro](https://github.com/fluffynuts/zarro) and realised
it would be useful elsewhere.

usage
---

Basic usage: read and write items:
```typescript
// cache data for 60 seconds
cache.write("the-data", dataObject, 60);
// read the item back, with type hints
// for Typescript. Note: there is no
// type enforcement!
const cachedValue = cache.read<TData>("the-data");

// evict the item
cache.forget("the-data");
expect(cache.read<TData>("the-data"))
  .toBeUndefined();
// use a fallback value instead:
expect(cache.read<string>("some-string", "default value"))
  .toEqual("default value");
```

Common usage: as a transparent pass-through, so you don't have to
manually write to the cache, or choose to read from it:
```typescript
// synchronous operations: read the "current" date
const now = cache.throughSync("now", () => new Date(), 60);
const then = cache.throughSync("now", () => new Date(), 60);

expect(then)
  .toEqual(now);


// async operations: read from an api
const data = await cache.through(
  "the-data",
  async() => await readFromApi(),
  60
);
const cached = await cache.through(
  "the-data",
  async() => await readFromApi(),
  60
);

expect(cached)
  .toEqual(data);
```

Other operations:
- `clear`: clears all cached items
- `trim`: removes expired items from the cache
  - there's no need to do this manually unless you're looking
    to free up some memory on a long-running process - whenever
    you read from the cache, if the matched cached item is expired,
    it is evicted
- `forget(key)`: evict the keyed item from the cache

Automatic trimming:
If you have a long-running node process, you may choose to
enable auto-trimming by setting `cache.trimIntervalSeconds` to
a non-zero value. This will cause the cache to periodically trim
the store. 

**NB: you _must_ set this value back to zero before
your process exits if you want a clean exit, otherwise a timer
will be held open.**

