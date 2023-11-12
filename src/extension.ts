// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MockupCodeLensProvider } from "./MockupCodeLensProvider";
import { createWebsocketServer } from "./createWebsocketServer";

let websocketServer: ReturnType<typeof createWebsocketServer> | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "react-mockups-vscode" is now active!'
  );

  // Start mockup server

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "react-mockups-vscode.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from react-mockups!");
    }
  );

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

      console.log("VIEW", {
        path: relativePath,
        exportName: args.mockup.exportName,
      });

      if (!websocketServer) {
        console.log("creating server...");
        websocketServer = createWebsocketServer(
          "127.0.0.1",
          1337,
          ({ broadcast }) => {
            broadcast("VIEW", {
              path: relativePath,
              exportName: args.mockup.exportName,
            });
          }
        );
      } else {
        websocketServer.broadcast("VIEW", {
          path: relativePath,
          exportName: args.mockup.exportName,
        });
      }
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

  context.subscriptions.push(disposable, codeLensProviderDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
