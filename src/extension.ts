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
  vscode.commands.registerCommand(
    "react-mockups.openMockup",
    (args: { mockup: { fullPath: string; exportName: string } }) => {
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
            exportName: args.mockup.exportName,
          })
      );

      if (!websocketServer) {
        websocketServer = createWebsocketServer("127.0.0.1", 1337);
      }
      websocketServer.broadcast("VIEW", {
        path: relativePath,
        exportName: args.mockup.exportName,
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
}

// This method is called when your extension is deactivated
export function deactivate() {}
