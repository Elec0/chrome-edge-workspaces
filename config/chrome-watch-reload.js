'use strict';

const { WebSocket, WebSocketServer } = require('ws');

const PLUGIN_NAME = 'ChromeWatchReload';
const RELOADER_ORIGIN = 'chrome-extension://falghmjeljhgmccbpffloemnfnmikked';

module.exports = class ChromeWatchReload {
  constructor(port = 3001) {
    this.port = port;
  }

  apply(compiler) {
    const server = this.server = new WebSocketServer({
      host: 'localhost',
      port: this.port,
      verifyClient: ({ origin }) => origin === RELOADER_ORIGIN,
    });

    server.on('listening', () => {
      console.log(`Chrome auto-reloader listening at ws://localhost:${server.address().port}`);
    });
    server.on('error', (error) => {
      console.warn(`Chrome auto-reloader unavailable: ${error.message}`);
    });
    server.on('connection', (socket) => {
      socket.on('error', (error) => {
        console.warn(`Chrome auto-reloader connection error: ${error.message}`);
      });
    });

    compiler.hooks.afterDone.tap(PLUGIN_NAME, (stats) => {
      if (stats.hasErrors()) return;

      for (const socket of server.clients) {
        if (socket.readyState === WebSocket.OPEN) socket.send('reload');
      }
    });

    const close = () => {
      if (this.server !== server) return;
      this.server = undefined;
      for (const socket of server.clients) socket.terminate();
      server.close();
    };
    compiler.hooks.watchClose.tap(PLUGIN_NAME, close);
    compiler.hooks.shutdown.tap(PLUGIN_NAME, close);
  }
};
