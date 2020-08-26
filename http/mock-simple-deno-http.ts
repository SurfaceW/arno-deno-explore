/**
 * 此文件用于演示 deno-http
 * 如何使用 AsyncIterable / AsyncIterableIterator
 */

class SimpleConnection {
  async listen(): Promise<string> {
    return new Promise((res) => {
      setTimeout(() => {
        res('connection income');
      }, 2000);
    });
  }
}

class SimpleHttpServer implements AsyncIterable<string> {
  private connection: SimpleConnection;
  constructor(connection: SimpleConnection) {
    this.connection = connection;
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<string> {
    while(true) {
      const res = await this.connection.listen();
      yield res;
    }
  }
}

const simpleHttpServer = new SimpleHttpServer(new SimpleConnection());

for await (const msg of simpleHttpServer) {
  console.log(msg);
}
