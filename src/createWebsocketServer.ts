import { WebSocket, WebSocketServer } from "ws";

export function createWebsocketServer(hostname = "127.0.0.1", port = 1337) {
  const wss = new WebSocketServer({ path: "/websocket", port, host: hostname });

  const state = {
    clients: [] as WebSocket[],
    activeMockup: null as null | {
      path: string;
      moduleExportKey: string;
    },
  };

  const broadcast = (type: string, payload: any) => {
    if (type === "VIEW") {
      state.activeMockup = payload;
    }
    for (const client of state.clients) {
      client.send(JSON.stringify({ type, payload }));
    }
  };

  wss.on("connection", (ws) => {
    if (state.activeMockup) {
      ws.send(JSON.stringify({ type: "VIEW", payload: state.activeMockup }));
    }
    state.clients.push(ws);

    // Remove the client from the list of connected clients
    ws.on("close", () => {
      state.clients = state.clients.filter((client) => client !== ws);
    });

    ws.on("message", (data, isBinary) => {
      const message = isBinary ? data : data.toString();

      if (typeof message !== "string") {
        return;
      }

      const messageData = JSON.parse(message);

      switch (messageData.type) {
        case "CLOSE": {
          state.activeMockup = null;
          break;
        }
      }
    });
  });

  const close = () => {
    wss.close();
  };

  return {
    state,
    broadcast,
    close,
  };
}
