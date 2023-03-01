import { describe, expect, test } from "@jest/globals";
import {
  cycle,
  drop,
  dropWhile,
  every,
  ffirst,
  filter,
  first,
  flatten,
  frequencies,
  groupBy,
  inc,
  interleave,
  interpose,
  intoArray,
  intoMap,
  intoObj,
  intoSet,
  iter,
  iterate,
  map,
  numCompare,
  pipe,
  range,
  reduce,
  remove,
  repeat,
  second,
  some,
  sort,
  sortBy,
  take,
  zero,
  zip,
} from "./iter-utils";

function itrEquals(itr, arr) {
  expect(Array.from(itr)).toStrictEqual(arr);
}

function mapToObj(m: Map<string, any>): { [key: string]: any } {
  const obj = {};
  m.forEach((v, k) => (obj[k] = v));
  return obj;
}

describe("iter-utils", () => {
  test("convert iterables into an iterator", () => {
    expect(iter([1, 2]).next().value).toBe(1);
    expect(iter([1, 2].values()).next().value).toBe(1);
    expect(iter({ a: 1 }).next().value).toStrictEqual(["a", 1]);
    expect(iter(new Map([["a", 1]])).next().value).toStrictEqual(["a", 1]);
    expect(iter(undefined).next().done).toEqual(true);
  });

  test("create an iterator for an object", () => {
    expect(first(iter("abc"))).toBe("a");
    expect(first(iter([1, 2, 3]))).toBe(1);
    expect(
      first(
        iter(
          new Map([
            ["a", 1],
            ["b", 2],
          ])
        )
      )
    ).toStrictEqual(["a", 1]);
    expect(first(range(10, 3))).toBe(3);
  });

  test("get first item", () => {
    expect(first([123, 124])).toBe(123);
    expect(first([])).toBeUndefined();
    expect(first(undefined)).toBeUndefined();

    expect(pipe(range(10, 6), first)).toBe(6);
  });

  test("get the first item of the first item", () => {
    expect(ffirst([[123]])).toBe(123);
  });

  test("iterate on initial value", () => {
    const itr = iterate((i) => i + 1, 0);
    expect(itr.next().value).toBe(0);
    expect(itr.next().value).toBe(1);
    expect(itr.next().value).toBe(2);
  });

  test("drop items", () => {
    const itr = drop(2)(iterate((i) => i + 1, 0)) as IterableIterator<number>;
    expect(itr.next().value).toBe(2);
    expect(itr.next().value).toBe(3);
    expect(itr.next().value).toBe(4);
  });

  test("drop items based on predicate", () => {
    itrEquals(dropWhile((i) => i < 4)(range(7)), [4, 5, 6]);

    itrEquals(
      pipe(
        range(7),
        dropWhile((i) => i < 4)
      ),
      [4, 5, 6]
    );
  });

  test("get second item", () => {
    expect(second([123, 124])).toBe(124);
    expect(second("abc")).toBe("b");
    expect(pipe(range(10, 10), second)).toBe(11);
    expect(second(undefined)).toBe(undefined);
  });

  test("map items to other items", () => {
    itrEquals(map(inc)([1, 2, 3]), [2, 3, 4]);
  });

  test("filter items", () => {
    itrEquals(
      pipe(
        range(4, 1),
        filter((i) => zero(i % 2))
      ),
      [2, 4]
    );
  });

  test("remove items", () => {
    itrEquals(
      pipe(
        range(4, 1),
        remove((i) => zero(i % 2))
      ),
      [1, 3]
    );
  });

  test("reduce items", () => {
    expect(
      pipe(
        range(3, 1),
        reduce((v, acc) => acc + v, 0)
      )
    ).toBe(6);
  });

  test("check if every item conforms to a predicate", () => {
    const even = (it) => it % 2 === 0;
    expect(every(even)(range(10, 0, 2))).toBe(true);
    // @ts-ignore
    expect(every(even)([...range(10, 0, 2), 1])).toBe(false);
  });

  test("check if some item conforms to a predicate", () => {
    const even = (it) => it % 2 === 0;
    expect(some(even)(range(10, 1, 2))).toBe(false);
    // @ts-ignore
    expect(some(even)([...range(10, 1, 2), 2])).toBe(true);
  });

  test("calculate frequencies of elements", () => {
    const a1 = ["a", "b", "a", "a", "c", "b"];
    expect(pipe(a1, frequencies, intoObj)).toStrictEqual({
      a: 3,
      b: 2,
      c: 1,
    });
  });

  test("sort items", () => {
    const a1 = [333, 4444, 1, 22];
    const expectedResult = [1, 22, 333, 4444];

    itrEquals(pipe(a1, sort(numCompare)), expectedResult);
  });

  test("sort elements by a function", () => {
    const a1 = ["333", "4444", "1", "22"];
    const expectedResult = ["1", "22", "333", "4444"];

    itrEquals(
      pipe(
        a1,
        sortBy((s) => s.length)
      ),
      expectedResult
    );
  });

  test("zip iterators", () => {
    const a1 = [1, 2, 3];
    const a2 = ["a", "b", "c"];
    itrEquals(zip(a1.values(), a2.values()), [
      [1, "a"],
      [2, "b"],
      [3, "c"],
    ]);

    itrEquals(zip(a1.values(), a2.values(), range(100, 10)), [
      [1, "a", 10],
      [2, "b", 11],
      [3, "c", 12],
    ]);
  });

  test("interleave items from iterators", () => {
    const a1 = [1, 2, 3];
    const a2 = ["a", "b", "c"];
    itrEquals(interleave(a1.values(), a2.values()), [1, "a", 2, "b", 3, "c"]);

    itrEquals(interleave(a1.values(), a2.values(), range(100, 10)), [
      1,
      "a",
      10,
      2,
      "b",
      11,
      3,
      "c",
      12,
    ]);
  });

  test("put paired elements into a map", () => {
    const a1 = [
      ["a", 1],
      ["b", 2],
    ];

    expect(
      mapToObj(pipe(zip(range(2, 1), range(2, 10)), intoMap))
    ).toStrictEqual({ 1: 10, 2: 11 });
  });

  test("put paired elements into an object", () => {
    const a1: [string | number, any][] = [
      ["a", 1],
      ["b", 2],
    ];
    expect(intoObj(a1)).toStrictEqual({ a: 1, b: 2 });

    expect(pipe(zip(range(2, 1), range(2, 10)), intoObj)).toStrictEqual({
      1: 10,
      2: 11,
    });

    // @ts-ignore
    expect(intoObj([...a1, ["a", 3]])).toStrictEqual({ a: 3, b: 2 });
  });

  test("put elements into an array", () => {
    itrEquals(pipe(range(3), intoArray), [0, 1, 2]);
  });

  test("put elements into a set", () => {
    // const s = intoSet(iter([1, 1, 2, 2, 3, 4]));
    const s: Set<number> = pipe([1, 1, 2, 2, 3, 4], intoSet);
    expect(s.size).toBe(4);
    expect(s.has(1)).toBeTruthy();
    expect(s.has(2)).toBeTruthy();
    expect(s.has(3)).toBeTruthy();
    expect(s.has(4)).toBeTruthy();
  });

  test("group elements by function", () => {
    const a1 = [
      [1, "een"],
      [2, "twee"],
      [1, "EEN"],
      [2, "TWEE"],
    ];
    const assertResult = (mapElements) => {
      let m = intoMap(mapElements);
      expect(m.get(1)).toStrictEqual([
        [1, "een"],
        [1, "EEN"],
      ]);
      expect(m.get(2)).toStrictEqual([
        [2, "twee"],
        [2, "TWEE"],
      ]);
    };

    assertResult(pipe(a1, groupBy(first)));
  });

  test("iterator with repeated value", () => {
    itrEquals(repeat(1, 3), [1, 1, 1]);
  });

  test("flatten nested arrays and iterators", () => {
    const a1 = [1, 2, [3, [4, 5]], 6, [7, 8].values(), 9];
    const result = intoArray(range(9, 1));
    itrEquals(flatten(a1), result);
  });

  test("cycle an iterator", () => {
    itrEquals(take(10)(cycle([1, 2, 3])), [1, 2, 3, 1, 2, 3, 1, 2, 3, 1]);
  });

  test("interleave items with a separator", () => {
    itrEquals(pipe(range(3), interpose("*")), [0, "*", 1, "*", 2]);
  });
});
