/**
 * 此文件用于演示 deno-http
 * 实现 http 模块对 socket connection TCP 链接的多路复用
 */

import {
  Deferred,
  deferred,
} from '../mods/deferred.ts';

class TCPConnection {
  private count: number = 0;
  async listen(): Promise<string> {
    return new Promise((res) => {
      setTimeout(() => {
        res(`tcp connection read ${this.count}`);
        this.count++;
      }, 5000);
    });
  }

  async readHttpRequest(): Promise<string> {
    return new HTTPConnection().readBuff();
  }
}

let httpCount = 0;
class HTTPConnection {
  async readBuff(): Promise<string> {
    return new Promise((res) => {
      setTimeout(() => {
        res(`http buff read ${httpCount}`);
        httpCount++;
      }, 2000);
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
class MuxAsyncIterator<T> implements AsyncIterable<T> {
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
  private tcpConnectionPool: TCPConnection = new TCPConnection();
  private async *iterateHttpRequests(conn: TCPConnection): AsyncIterableIterator<string> {
    while(true) {
      const msg = await conn.readHttpRequest();
      yield msg;
    }
  }

  private async *acceptConnAndIterateHttpRequests(mux: MuxAsyncIterator<string>): AsyncIterableIterator<string> {
    const connectionMsg = await this.tcpConnectionPool.listen();
    yield connectionMsg;
    mux.add(this.acceptConnAndIterateHttpRequests(mux));
    yield* this.iterateHttpRequests(this.tcpConnectionPool);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<string> {
    const mux: MuxAsyncIterator<string> = new MuxAsyncIterator();
    mux.add(this.acceptConnAndIterateHttpRequests(mux));
    return mux.iterate();
  }
}

const server = new MuxServer();
for await (const msg of server) {
  console.log(msg);
}
