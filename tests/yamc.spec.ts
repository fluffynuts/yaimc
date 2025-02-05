import "expect-even-more-jest";
import { faker } from "@faker-js/faker";
import { cache, Cache, ICache, Optional } from "../src";

describe(`yamc`, () => {
  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  it(`should export a cache instance`, async () => {
    // Arrange
    // Act
    expect(cache)
      .toExist();
    expect(cache.read)
      .toBeFunction();
    expect(cache.write)
      .toBeFunction();
    expect(cache.through)
      .toBeFunction();
    expect(cache.throughSync)
      .toBeFunction();
    expect(cache.clear)
      .toBeFunction();
    expect(cache.forget)
      .toBeFunction();
    expect(cache.count)
      .toEqual(0);
    expect(cache.keys)
      .toBeEmptyArray();
    // Assert
  });

  describe(`read and write`, () => {
    it(`should write and read within ttl time`, async () => {
      // Arrange
      const
        sut = create(),
        key = faker.string.alphanumeric(),
        value = faker.number.int();
      // Act
      sut.write(key, value, 120);
      await sleep(500);
      const result = sut.read<number>(key);
      // Assert
      expect(result)
        .toEqual(value);
    });

    it(`should not return an expired value`, async () => {
      // Arrange
      const
        sut = create(),
        key = faker.string.alphanumeric(),
        originalValue = 420,
        fallbackValue = 69;
      // Act
      sut.write(key, originalValue, 0.1);
      await sleep(200);
      const result = sut.read<number>(key, fallbackValue);
      // Assert
      expect(result)
        .toEqual(fallbackValue);
    });
  });

  describe(`clear`, () => {
    it(`should clear caching`, async () => {
      // Arrange
      const
        key = faker.string.alphanumeric(),
        value = faker.word.sample(),
        sut = create();
      // Act
      sut.write(key, value, 120);
      expect(sut.read(key))
        .toEqual(value);
      sut.clear();
      // Assert
    });
  });

  describe(`through`, () => {
    describe(`synchronous variant`, () => {
      it(`should only call the function once when invoked within ttl`, async () => {
        // Arrange
        let calls = 0;
        const
          sut = create(),
          key = faker.string.alphanumeric(),
          expected = faker.number.int(),
          generator = () => {
            calls++;
            return expected;
          }
        // Act
        const result1 = sut.throughSync(key, generator, 5);
        const result2 = sut.throughSync(key, generator, 5);
        // Assert
        expect(result1)
          .toEqual(expected);
        expect(result2)
          .toEqual(expected);
        expect(calls)
          .toEqual(1);
      });

      it(`should call again if invoked outside ttl`, async () => {
        // Arrange
        let calls = 0;
        const
          sut = create(),
          key = faker.string.alphanumeric(),
          expected = faker.number.int(),
          generator = () => {
            calls++;
            return expected;
          }
        // Act
        const result1 = sut.throughSync(key, generator, 0.2);
        await sleep(500);
        const result2 = sut.throughSync(key, generator, 0.2);
        // Assert
        expect(result1)
          .toEqual(expected);
        expect(result2)
          .toEqual(expected);
        expect(calls)
          .toEqual(2);
      });
    });
    describe(`async variant`, () => {
      it(`should only call the function once when invoked within ttl`, async () => {
        // Arrange
        let calls = 0;
        const
          sut = create(),
          key = faker.string.alphanumeric(),
          expected = faker.number.int(),
          generator = async () => {
            calls++;
            await sleep(1);
            return expected;
          }
        // Act
        const result1 = await sut.through(key, generator, 5);
        const result2 = await sut.through(key, generator, 5);
        // Assert
        expect(result1)
          .toEqual(expected);
        expect(result2)
          .toEqual(expected);
        expect(calls)
          .toEqual(1);
      });

      it(`should call again if invoked outside ttl`, async () => {
        // Arrange
        let calls = 0;
        const
          sut = create(),
          key = faker.string.alphanumeric(),
          expected = faker.number.int(),
          generator = async () => {
            calls++;
            await sleep(1);
            return expected;
          }
        // Act
        const result1 = await sut.through(key, generator, 0.2);
        await sleep(500);
        const result2 = await sut.through(key, generator, 0.2);
        // Assert
        expect(result1)
          .toEqual(expected);
        expect(result2)
          .toEqual(expected);
        expect(calls)
          .toEqual(2);
      });
    });
  });

  describe(`automatic trimming`, () => {
    it(`should be able to enable auto trimming`, async () => {
      // Arrange
      const
        key = faker.string.alphanumeric(),
        value = faker.string.alphanumeric(),
        sut = create();
      // Act
      sut.trimIntervalSeconds = 0.1;
      sut.write(key, value, 0.2);
      const stored = sut.read<string>(key);
      await sleep(400);
      const result = sut.read<string>(key);
      // Assert
      expect(stored)
        .toEqual(value);
      expect(result)
        .toBeUndefined();
    });
  });

  describe(`touch`, () => {
    it(`should keep the item alive`, async () => {
      // Arrange
      const
        key = faker.string.alphanumeric(),
        value = faker.string.alphanumeric(),
        sut = create();
      // Act
      sut.write(key, value, 5);
      for (let i = 0; i < 8; i++) {
        await sleep(250);
        sut.touch(key);
      }
      const result = sut.read(key);
      // Assert
      expect(result)
        .toEqual(value);
    });
  });

  let current = undefined as Optional<ICache>
  afterEach(() => {
    if (current) {
      current.trimIntervalSeconds = 0;
    }
  });

  function create(): ICache {
    return current = new Cache();
  }
});
