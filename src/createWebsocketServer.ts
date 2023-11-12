import { WebSocket, WebSocketServer } from "ws";
import { log } from "./logger";

type Mockups = Array<{
  title: string;
  path: string;
  children?: Mockups;
}>;

type AppState = {
  /** The project's root directory. Useful for navigating to individual mockup files */
  projectRoot: string;
  /** Whether the server has synced with an app client */
  hasSynced: boolean;
  /** Current relative path to mockup. You can determine the active mockup by searching "mockups[x].path" */
  path: string | null;
  /** List of synced mockups with the app client */
  mockups: Mockups[];
};

export function createWebsocketServer(
  hostname = "127.0.0.1",
  port = 1337,
  onReady?: (params: { broadcast(type: string, payload: any): void }) => void
) {
  const wss = new WebSocketServer({ path: "/websocket", port, host: hostname });

  const state = {
    clients: [] as WebSocket[],
    app: {
      projectRoot: process.cwd(),
      path: "",
      hasSynced: false,
      mockups: [],
    } as AppState,
  };

  const broadcast = (type: string, payload: any) => {
    for (const client of state.clients) {
      client.send(JSON.stringify({ type, payload }));
    }
  };

  wss.on("connection", (ws) => {
    onReady?.({ broadcast });
    state.clients.push(ws);

    // Remove the client from the list of connected clients
    ws.on("close", () => {
      console.log("closed", ws);
      state.clients = state.clients.filter((client) => client !== ws);
    });

    ws.on("message", (data, isBinary) => {
      // WS 8 breaking change: messages can be binary
      const message = isBinary ? data : data.toString();

      if (typeof message !== "string") {
        return;
      }

      const messageData = JSON.parse(message);

      console.log("message", messageData);

      switch (messageData.type) {
        // When IDE clients try to connect to the server, send back app state
        case "PING": {
          if (state.app.hasSynced) {
            ws.send(JSON.stringify({ type: "SYNC_STATE", payload: state.app }));
          }
          break;
        }
        // When the app client connects, store the current state & update IDE clients
        case "UPDATE_STATE": {
          state.app = {
            ...state.app, // retain "projectRoot"
            ...(messageData.payload as AppState),
            hasSynced: true,
          };
          // Update clients
          for (const client of state.clients.filter((c) => c !== ws)) {
            client.send(
              JSON.stringify({ type: "SYNC_STATE", payload: state.app })
            );
          }
          break;
        }
        case "NAVIGATE": {
          state.app.path = messageData.payload as string;
          // Update both IDE & app clients (except the one that sent the message)
          for (const client of state.clients.filter((c) => c !== ws)) {
            client.send(
              JSON.stringify({ type: "NAVIGATE", payload: state.app.path })
            );
          }
          break;
        }
      }
    });
  });

  return {
    broadcast,
  };
}
