/**
 * 此文件用于演示 deno-http
 * 实现 http 模块对 socket connection TCP 链接的多路复用
 */

// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
import { Deferred, deferred } from "./deno/std/async/deferred.ts";

class TCPConnection {
  private count: number = 0;
  async listen(): Promise<string> {
    return new Promise((res) => {
      setTimeout(() => {
        res(`tcp connection read ${this.count}`);
        this.count++;
      }, 10000);
    });
  }
}

class HTTPConnection {
  private count: number = 0;
  async readBuff(): Promise<string> {
    return new Promise((res) => {
      setTimeout(() => {
        res(`http buff read ${this.count}`);
        this.count++;
      }, 1000);
    });
  }
}

interface TaggedYieldedValue<T> {
  iterator: AsyncIterableIterator<T>;
  value: T;
}

/** The MuxAsyncIterator class multiplexes multiple async iterators into a
 * single stream. It currently makes an assumption:
 * - The final result (the value returned and not yielded from the iterator)
 *   does not matter; if there is any, it is discarded.
 */
export class MuxAsyncIterator<T> implements AsyncIterable<T> {
  private iteratorCount = 0;
  private yields: Array<TaggedYieldedValue<T>> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private throws: any[] = [];
  private signal: Deferred<void> = deferred();

  add(iterator: AsyncIterableIterator<T>): void {
    ++this.iteratorCount;
    this.callIteratorNext(iterator);
  }

  private async callIteratorNext(
    iterator: AsyncIterableIterator<T>,
  ): Promise<void> {
    try {
      const { value, done } = await iterator.next();
      if (done) {
        --this.iteratorCount;
      } else {
        this.yields.push({ iterator, value });
      }
    } catch (e) {
      this.throws.push(e);
    }
    this.signal.resolve();
  }

  async *iterate(): AsyncIterableIterator<T> {
    while (this.iteratorCount > 0) {
      // Sleep until any of the wrapped iterators yields.
      await this.signal;

      // Note that while we're looping over `yields`, new items may be added.
      for (let i = 0; i < this.yields.length; i++) {
        const { iterator, value } = this.yields[i];
        yield value;
        this.callIteratorNext(iterator);
      }

      if (this.throws.length) {
        for (const e of this.throws) {
          throw e;
        }
        this.throws.length = 0;
      }
      // Clear the `yields` list and reset the `signal` promise.
      this.yields.length = 0;
      this.signal = deferred();
    }
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this.iterate();
  }
}

class MuxServer implements AsyncIterable<string> {
  private connection: SimpleConnection;
  constructor(connection: SimpleConnection) {
    this.connection = connection;
  }

  private async *acceptConnAndIterateHttpRequests(mux: MuxAsyncIterator<string>): AsyncIterableIterator<string> {

  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<string> {
    const mux: MuxAsyncIterator<string> = new MuxAsyncIterator();
    mux.add(this.acceptConnAndIterateHttpRequests(mux));
    return mux.iterate();
  }
}

// const server = new SimpleHttpServer(new SimpleConnection());

// for await (const msg of simpleHttpServer) {
//   console.log(msg);
// }
