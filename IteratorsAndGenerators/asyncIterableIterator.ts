const asyncFn = async () =>
  new Promise((res) => {
    setTimeout(() => res(), 1000);
  });

async function* asyncGenerator(): AsyncGenerator {
  await asyncFn();
  yield Promise.resolve(1);
  yield new Promise((res) => {
    setTimeout(() => {
      res(2);
    }, 500);
  });
  yield 3;
  yield Promise.resolve(4);
}

console.log('====== NormalAsyncIterator ======');
export async function asyncGeneratorCall() {
  const generator = asyncGenerator();
  console.log(await generator.next());
  console.log(await generator.next());
  console.log(await generator.next());
  console.log(await generator.next());
}
asyncGeneratorCall();

console.log('====== asyncObjGenerator ======');
class AsyncIteratableObject implements AsyncIterable<number> {
  async *[Symbol.asyncIterator]() {
    await asyncFn();
    yield 21;
    await asyncFn();
    yield 22;
    await asyncFn();
    yield 23;
  }
}
export async function asyncObjGenerator() {
  for await (const i of new AsyncIteratableObject()) {
    console.log(i);
  }
}
asyncObjGenerator();
