/**
 * Sync generator
 */
function *normalGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

console.log('====== NormalGeneratorFunction ======');
const data = normalGenerator();
console.log(data.next());
console.log(data.next());
console.log(data.next());
console.log(data.next());

/**
 * implementable generator
 */
console.log('====== ObjWithIterator ======');
class ObjWithIterator {
  [Symbol.iterator](): IterableIterator<number> {
    return normalGenerator();
  }
}
for (const d of new ObjWithIterator()) {
  console.log(d);
}

console.log('====== ObjWithIteratorWithNextFunction ======');
class ObjWithNextFn implements IterableIterator<number> {
  private count: number = 1;
  next() {
    return { value: this.count++, done: this.count > 4 };
  }
  [Symbol.iterator]() {
    return this;
  }
}
for (const d of new ObjWithNextFn()) {
  console.log(d);
}

console.log('====== ObjWithIteratorFn ======');
class ObjWithIteratorFn {
  *[Symbol.iterator](): IterableIterator<number> {
    yield 2000;
    yield* normalGenerator();
  }
}
const newObj = new ObjWithIteratorFn();
for (const d of newObj) {
  console.log(d);
}
