/**
 * 此文件用于演示 deno-http
 * 实现 http 模块对 socket connection TCP 链接的多路复用
 */

import {
  Deferred,
  deferred,
} from '../mods/deferred.ts';

class TCPConnectionPool {
  public count: number = 0;
  async listen(): Promise<string> {
    return new Promise((res) => {
      setTimeout(() => {
        res(`tcp connection connect #${this.count}`);
        this.count++;
      }, 5000);
    });
  }

  async readHttpRequest(connectId: string): Promise<string> {
    return new HTTPConnection().readBuff(connectId);
  }
}

let httpCount = 0;
class HTTPConnection {
  async readBuff(connId: string): Promise<string> {
    return new Promise((res) => {
      setTimeout(() => {
        res(`http buff read ${httpCount} from tcp: #${connId}`);
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
  private signal: Deferred<void> = deferred();
  add(iterator: AsyncIterableIterator<T>): void {
    ++this.iteratorCount;
    this.callIteratorNext(iterator);
  }
  private async callIteratorNext(
    iterator: AsyncIterableIterator<T>,
  ): Promise<void> {
    const { value, done } = await iterator.next();
    if (done) {
      --this.iteratorCount;
    } else {
      this.yields.push({ iterator, value });
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
  private tcpConnectionPool: TCPConnectionPool = new TCPConnectionPool();
  private async *iterateHttpRequests(conn: TCPConnectionPool, connectId: string): AsyncIterableIterator<string> {
    while(true) {
      const msg = await conn.readHttpRequest(connectId);
      yield msg;
    }
  }

  private async *acceptConnAndIterateHttpRequests(mux: MuxAsyncIterator<string>): AsyncIterableIterator<string> {
    const connectionMsg = await this.tcpConnectionPool.listen();
    yield connectionMsg;
    mux.add(this.acceptConnAndIterateHttpRequests(mux));
    yield* this.iterateHttpRequests(this.tcpConnectionPool, connectionMsg.split('#')[1]);
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
