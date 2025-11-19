// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MockupCodeLensProvider } from "./MockupCodeLensProvider";
import { createWebsocketServer } from "./createWebsocketServer";
import { log } from "./logger";

let websocketServer: ReturnType<typeof createWebsocketServer> | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  try {
    log.appendLine("[React Mockups]: Extension activated");
  } catch (error) {
    console.error("[React Mockups] Error during activation:", error);
    vscode.window.showErrorMessage(
      `React Mockups extension failed to activate: ${error}`
    );
  }

  vscode.commands.registerCommand(
    "react-mockups.openMockup",
    (args: { mockup: { fullPath: string; moduleExportKey: string } }) => {
      const localWorkspace =
        vscode.workspace
          .getWorkspaceFolder(vscode.Uri.file(args.mockup.fullPath))
          ?.uri.toString() || "";

      const relativePath = args.mockup.fullPath.replace(
        localWorkspace.replace("file://", ""),
        "."
      );

      log.appendLine(
        "[openMockup]: " +
          JSON.stringify({
            path: relativePath,
            moduleExportKey: args.mockup.moduleExportKey,
          })
      );

      if (!websocketServer) {
        const config = vscode.workspace.getConfiguration("react-mockups");
        const host = config.get<string>("websocket.host", "127.0.0.1");
        const port = config.get<number>("websocket.port", 1337);
        websocketServer = createWebsocketServer(host, port);
        log.appendLine(`[WebSocket Server]: Created server on ${host}:${port}`);
      }
      websocketServer.broadcast("VIEW", {
        path: relativePath,
        moduleExportKey: args.mockup.moduleExportKey,
      });
    }
  );

  const docSelector: vscode.DocumentSelector = {
    language: "typescriptreact",
    scheme: "file",
    pattern: "**/*.mockup.tsx",
  };

  const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
    docSelector,
    new MockupCodeLensProvider()
  );

  context.subscriptions.push(codeLensProviderDisposable);

  vscode.commands.registerCommand("react-mockups.stopWebsocketServer", () => {
    if (websocketServer) {
      websocketServer.close();
      websocketServer = null;
      log.appendLine("[WebSocket Server]: Server stopped");
      vscode.window.showInformationMessage("WebSocket server stopped");
    } else {
      vscode.window.showInformationMessage("WebSocket server is not running");
    }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (websocketServer) {
    websocketServer.close();
    websocketServer = null;
  }
}
