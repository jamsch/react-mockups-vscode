import {
  CodeLens,
  CodeLensProvider,
  Command,
  Range,
  TextDocument,
} from "vscode";

export class MockupCodeLensProvider implements CodeLensProvider {
  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    // Find all export statements that have StudlyCase names
    // and create a CodeLens for each one
    // For each CodeLens, create a command that will open the mockup
    // in the mockup server
    const exportRegex =
      /export (const|default function|default|function) ([A-Z][a-zA-Z0-9]*)/g;

    // "export default {" syntax
    const legacyExportRegex = /export (default) {/g;

    const codeLenses: CodeLens[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      let match = exportRegex.exec(line.text);
      if (!match) {
        match = legacyExportRegex.exec(line.text);
      }

      if (!match) {
        continue;
      }

      // either "default" or the name of the function
      // This is so that we can access `module.[exportName]` on the client
      const moduleExportKey = match[1].includes("default")
        ? "default"
        : match[2];

      const range = new Range(
        i,
        match.index,
        i,
        match.index + moduleExportKey.length
      );

      const command: Command = {
        command: "react-mockups.openMockup",
        arguments: [
          {
            mockup: {
              fullPath: document.uri.path,
              moduleExportKey,
            },
          },
        ],
        title: "Open Mockup",
      };
      const codeLens = new CodeLens(range, command);
      codeLenses.push(codeLens);
    }

    return codeLenses;
  }
}
