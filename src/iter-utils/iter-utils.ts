export type Iter<T = any> = IterableIterator<T> | Array<T> | string;
export type Operator<T = any, U = any> = (itr: Iter<T>) => U;

// Useful mutation and predicate functions
export const inc = (i: number) => (i !== undefined ? i + 1 : 1);
export const dec = (i: number) => i - 1;
export const zero = (i: number) => i === 0;
export const pos = (i: number) => i > 0;
export const neg = (i: number) => i < 0;

export function mutateMapEntry(
  m: Map<any, any>,
  k: any,
  updateFn: (value: any) => any
) {
  m.set(k, updateFn(m.get(k)));
}

/**
 * Returns the iterator for an iterable object.
 */
export function iter(iterable: any): IterableIterator<any> {
  // when the iterable is undefined just return and empty iterator
  if (iterable === undefined) {
    return [].values();
  }

  // if this is already an iterator just let it through
  if (typeof iterable["next"] === "function") {
    return iterable;
  }

  try {
    return iterable[Symbol.iterator]();
  } catch (_) {
    return Object.entries(iterable).values();
  }
}

/**
 * Create a pipe of operators for the items in an iterable and execute it. The operator functions takes
 * an iterable as a parameter and produces a new iterator in most cases. The operator functions that produce
 * iterators can be chained in the pipe function. The last function of the operator functions is
 * often a function that reduces the result to a single value like a map or array for instance.
 *
 * Example: pipe([2, 1, 4, 3], map(inc), sort(), intoArray) will produce [2, 3, 4, 5]
 * @param iterable The iterable that will be transformed by the chain of operators.
 * @param operators Functions that takes an iterable as a parameter.
 * @see {@link pipeDebug}
 */
export function pipe(iterable: Iter, ...operators: Operator[]) {
  const itr = iter(iterable);
  const f = function (txs) {
    let [first, ...rest] = txs;

    if (rest.length === 0) {
      return first(itr);
    }

    return first(f(rest));
  };

  return f(operators.reverse());
}

export function logStep<T>(): Operator<T, IterableIterator<T>> {
  return tap((it) =>
    console.log("intermediate pipe result: " + JSON.stringify(it))
  );
}

/**
 * Perform the pipe operation but the results of the intermediate steps will be logged.
 * @param iterable The iterable that will be transformed by the chain of transducers.
 * @param transducers Functions that takes an iterable as a parameter.
 * @see {@link pipe}
 */
export function pipeDebug(iterable, ...transducers) {
  console.log("---[Pipe iteration start]------------------------------");
  const result = pipe(
    iterable,
    logStep(),
    // @ts-ignore
    ...interpose(logStep())(transducers)
  );
  console.log("pipe iteration result => " + JSON.stringify(result));
  console.log("---[Pipe iteration end]--------------------------------");
  return result;
}

/**
 * Create an iterator where each item generated by applying the previous item to the given function.
 * @param itrFn A function to calculate the next item.
 * @param initialValue The first item of the iterator
 */
export function* iterate<T>(
  itrFn: (it: T) => T,
  initialValue: T
): IterableIterator<T> {
  for (let i = initialValue; ; i = itrFn(i)) {
    yield i;
  }
}

/**
 * An operator that will take a specified number of items from an iterator.
 * @param numItemsToTake
 * @returns An iterable or function that returns an iterable when itr is not provided
 * @see {@link pipe}
 */
export function take<T>(
  numItemsToTake: number
): Operator<T, IterableIterator<T>> {
  return function* (o: Iter<T>) {
    const itr_ = iter(o);
    for (let i = 0; i < numItemsToTake; i += 1) {
      const next = itr_.next();
      if (next.done) {
        break;
      }
      yield next.value;
    }
  };
}

/**
 * An operator that drops items from an iterable
 */
export function drop<T>(
  numItemsToDrop: number
): Operator<T, IterableIterator<T>> {
  return (o: Iter<T>) => {
    const itr_ = iter(o);
    for (let i = 0; i < numItemsToDrop; i += 1) {
      if (itr_.next().done) {
        break;
      }
    }
    return itr_;
  };
}
/**
 * An operator that drops items from an iterable while the predicate holds true.
 * @param predFn Predicate function
 */
export function dropWhile<T>(
  predFn: (it: T) => boolean
): Operator<T, IterableIterator<T>> {
  return function* (itr: Iter<T>) {
    const itr_ = iter(itr);
    let dropEnded = false;
    // @ts-ignore
    for (let it of itr_) {
      if (!predFn(it) || dropEnded) {
        dropEnded = true;
        yield it;
      }
    }
  };
}

/**
 * Create a range of numbers
 * @param numElements Number of items in the iterator
 * @param start Start value
 * @param step Distance between items in the iterator
 */
export function range<T>(
  numElements: number,
  start = 0,
  step = 1
): IterableIterator<T> {
  return take(numElements)(
    iterate((i) => i + step, start)
  ) as IterableIterator<T>;
}

/**
 * Returns the first item in an iterable or undefined when there is none.
 */
export function first<T>(itr: Iter<T>): T | undefined {
  const itr_ = iter(itr);
  // we do this funny for loop so that we do not have to check if iterator is empty etc.
  // @ts-ignore
  for (let it of itr_) {
    return it;
  }

  return undefined;
}

/**
 * Returns first of the first item in an iterable.
 */
export function ffirst<T>(itr: Iter<T>): T | undefined {
  return first(first(itr) as IterableIterator<T>) as T;
}

/**
 * Returns the second item in an iterable
 */
export function second<T>(itr: Iter<T>): T | undefined {
  // @ts-ignore
  return first(drop(1)(itr));
}

/**
 * Operator that maps one iterator to another one
 * @param mapFn Mapping function
 * @see {@link pipe}
 */
export function map<T, U>(
  mapFn: (it: T) => U
): Operator<T, IterableIterator<U>> {
  return function* (itr: Iter<T>) {
    const itr_ = iter(itr) as IterableIterator<T>;
    // @ts-ignore
    for (let it of itr_) {
      yield mapFn(it);
    }
  };
}

export function tap<T>(
  sideEffectFn: (it: any) => void
): Operator<T, IterableIterator<T>> {
  return function* (itr: Iter<T>) {
    const itr_ = iter(itr) as IterableIterator<T>;
    // @ts-ignore
    for (let it of itr_) {
      sideEffectFn(it);
      yield it;
    }
  };
}

/**
 * Filter operator for iterables.
 * @param predFn Predicate function
 * @see {@link pipe}
 */
export function filter<T>(
  predFn: (it: T) => boolean
): Operator<T, IterableIterator<T>> {
  return function* (itr: Iter<T>) {
    const itr_ = iter(itr) as IterableIterator<T>;
    // @ts-ignore
    for (let it of itr_) {
      if (predFn(it)) {
        yield it;
      }
    }
  };
}

/**
 * Remove operator for iterables. This is the opposite of the Filter operator.
 * @param predFn Predicate function
 * @see {@link pipe}
 */
export function remove<T>(
  predFn: (it: T) => boolean
): Operator<T, IterableIterator<T>> {
  return function* (itr) {
    const itr_ = iter(itr) as IterableIterator<T>;
    // @ts-ignore
    for (let it of itr_) {
      if (!predFn(it)) {
        yield it;
      }
    }
  };
}

/**
 * Reduce operator for iterables.
 * @param reducerFn Reduce function
 * @param initialValue Initial value of the reduction process
 * @see {@link pipe}
 */
export function reduce<T, U>(
  reducerFn: (it: T, acc: U) => U,
  initialValue: U
): Operator<T, U> {
  return function (itr) {
    let acc = initialValue;

    const itr_ = iter(itr) as IterableIterator<T>;
    // @ts-ignore
    for (let it of itr_) {
      acc = reducerFn(it, acc);
    }

    return acc;
  };
}

/**
 * Operator to check if all the items in an iterable conforms to the predicate function.
 * @param predFn Predicate function
 * @see {@link pipe}
 */
export function every<T>(predFn): Operator<T, boolean> {
  return function (itr) {
    const itr_ = iter(itr) as IterableIterator<T>;
    return reduce((it, acc) => acc && predFn(it), true)(itr_);
  };
}

/**
 * Operator to check if some items in the iterable conforms to the predicate function.
 * @param predFn Predicate function
 * @see {@link pipe}
 */
export function some<T>(predFn): Operator<T, boolean> {
  return function (itr) {
    const itr_ = iter(itr) as IterableIterator<T>;
    // @ts-ignore
    for (let it of itr_) {
      if (predFn(it)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Operator to group items in an iterable by the result of a grouping function. The result is an iterator where the items are
 * pairs of the group function result and an array of the grouped items.
 * groupBy(pos)([-2, -1, 0, 1, 2]) for instance will produce items [true, [0, 1, ,2]], [false, [-2, -1]]
 * @param groupKeyFn Grouping function
 * @see {@link pipe}
 */
export function groupBy<T, U>(
  groupKeyFn: (it: T) => U
): Operator<T, IterableIterator<[U, Array<T>]>> {
  return function (itr) {
    const itr_ = iter(itr) as IterableIterator<T>;
    return reduce((v: T, acc) => {
      const k = groupKeyFn(v);

      if (acc.has(k)) {
        acc.set(k, [...acc.get(k), v]);
      } else {
        acc.set(k, [v]);
      }

      return acc;
    }, new Map())(itr_).entries();
  };
}

/**
 * Calculate the frequencies of items in an iterable. The result is an iterator where the items are pairs of a value and the number
 * of times the value occurred.
 * @see {@link pipe}
 */
export function frequencies<T = any>(
  itr: Iter<T>
): IterableIterator<[T, number]> {
  const itr_ = iter(itr) as IterableIterator<T>;
  const result = new Map();

  // @ts-ignore
  for (let it of itr_) {
    mutateMapEntry(result, it, inc);
  }

  return result.entries();
}

/**
 * Compare two numbers
 */
export const numCompare = (a: number, b: number) => a - b;

/**
 * Compare two strings
 */
export const strCompare = (a: any, b: any) => `${a}`.localeCompare(`${b}`);

/**
 * Do a number compare when the parameters are numbers else do a string compare
 */
export const defaultCompare = (a, b) => {
  if (typeof a === "number") {
    return numCompare(a, b);
  }

  return strCompare(a, b);
};

/**
 * Operator to sort the items in the iterable by using a sort function.
 * @param compareFn A function to compare two items
 * @see {@link pipe}
 */
export function sort<T>(
  compareFn: (a: T, b: T) => number = defaultCompare
): Operator<T, IterableIterator<T>> {
  return function (itr) {
    const itr_ = iter(itr) as IterableIterator<T>;
    const arr = Array.from(itr_);
    return arr.sort(compareFn).values();
  };
}

/**
 * Operator to sort the items in the iterable by the result of a function.
 * @param getSortPropertyFn A function that must return the feature of the input items that must be sorted on.
 * @param compareFn A function to compare 2 items.
 * @see {@link pipe}
 */
export function sortBy<T>(
  getSortPropertyFn,
  compareFn: (a: T, b: T) => number = defaultCompare
): Operator<T, IterableIterator<T>> {
  return function (itr) {
    const itr_ = iter(itr) as IterableIterator<T>;
    const arr = Array.from(itr_);
    return arr
      .sort((a, b) => compareFn(getSortPropertyFn(a), getSortPropertyFn(b)))
      .values();
  };
}

/**
 * Zip two or more iterators into a single iterator. There will be as many items as in the input iterator with the
 * least number of items and therefore the number of items in the iterators does not have to match.
 */
export function* zip(...iterators: Iter[]): IterableIterator<any[]> {
  const iters = iterators.map(iter);
  while (true) {
    const nextItems = iters.map((itr) => itr.next());
    if (nextItems.some((nextItem) => nextItem.done)) {
      break;
    }
    yield nextItems.map((nextItem) => nextItem.value);
  }
}

/**
 * Interleave the items of the input iterators into a single iterator.
 */
export function* interleave(...iterators: Iter[]): IterableIterator<any> {
  while (true) {
    const nextItems = iterators.map((itr) => {
      const itr_ = iter(itr);
      return itr_.next();
    });
    if (nextItems.some((nextItem) => nextItem.done)) {
      break;
    }
    for (let nextItem of nextItems) {
      yield nextItem.value;
    }
  }
}

/**
 * Pour an iterable with key/value pairs into a Map
 * @see {@link pipe}
 */
export function intoMap<K, V>(itr: Iter<[K, V]>): Map<K, V> {
  const itr_ = iter(itr) as IterableIterator<[K, V]>;
  return new Map(itr_);
}

/**
 * Pour an iterable with key/value pairs into an object
 * @see {@link pipe}
 */
export function intoObj(itr: Iter<[string | number, any]>): {
  [key: string | number]: any;
} {
  const itr_ = iter(itr) as IterableIterator<[string | number, any]>;
  return pipe(
    itr_,
    // mapElementsTransducer,
    reduce(([k, v], obj) => {
      obj[k] = v;
      return obj;
    }, {})
  );
}

/**
 * Pour an iterable into an array.
 * @param itr An iterator or iterable
 */
export function intoArray<T>(itr: Iter<T>): Array<T> {
  const itr_ = iter(itr) as IterableIterator<T>;
  return Array.from(itr_);
}

/**
 * Pour an iterable into a set.
 */
export function intoSet<T>(itr): Set<T> {
  const itr_ = iter(itr) as IterableIterator<T>;
  return new Set(itr_);
}

/**
 * Create an infinite iterator by repeatedly calling a provided function.
 * @param fn The function to call repeatedly
 * @returns {IterableIterator<*>}
 */
export function repeatedly<T>(fn: () => T): IterableIterator<T> {
  return iterate(fn, fn());
}

/**
 * Create an iterator where the same value is repeated on every iteration.
 */
export function repeat<T>(val: T, numRepeats: number): IterableIterator<T> {
  return pipe(
    range(numRepeats),
    map(() => val)
  );
}

function isArrayOrIter(o) {
  return o instanceof Array || typeof o["next"] === "function";
}

/**
 * Flatten nested iterables into an iterator of the individual items.
 * Example: flatten([1, 2, [3, [4, 5]], 6, [7, 8]) produces [1, 2, 3, 4, 5, 6, 7, 8]
 * @see {@link pipe}
 */
export function flatten(itr: Iter): IterableIterator<any> {
  const f = function* (itr_) {
    for (let it of itr_) {
      if (isArrayOrIter(it)) {
        yield* f(iter(it));
      } else {
        yield it;
      }
    }
  };
  return f(itr);
}

/**
 * Create an infinite iterator that will repeat the given iterator.
 */
export function cycle(itr: Iter): IterableIterator<any> {
  return flatten(iterate(() => itr, itr));
}

/**
 * Operator that will interpose the items in an iterable with a separator object.
 * @see {@link pipe}
 */
export function interpose(separator: any): Operator<any, IterableIterator<any>> {
  return function* (itr) {
    const itr_ = iter(itr);
    let first = true;
    // @ts-ignore
    for (let it of itr_) {
      if (!first) {
        yield separator;
      }

      yield it;

      first = false;
    }
  };
}
