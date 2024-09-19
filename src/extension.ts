import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "pbi-tools" is now active!');

    // Register Command for: pbi-tools extract -pid id -watch
    const extractWatch = vscode.commands.registerCommand('pbi-tools.extractWatch', () => {
        // Run the command in the terminal
        const terminal = vscode.window.createTerminal('pbi-tools');
        terminal.sendText('pbi-tools extract -pid id -watch');
        terminal.show();
    });

    // Register Command for: pbi-tools extract "MOH.pbix"
    const extractFile = vscode.commands.registerCommand('pbi-tools.extractFile', () => {
        // Run the command in the terminal
        const terminal = vscode.window.createTerminal('pbi-tools');
        terminal.sendText('pbi-tools extract "MOH.pbix"');
        terminal.show();
    });

    // Register Command for: pbi-tools compile .\MOH -format PBIT
    const compileFolder = vscode.commands.registerCommand('pbi-tools.compileFolder', () => {
        // Run the command in the terminal
        const terminal = vscode.window.createTerminal('pbi-tools');
        terminal.sendText('pbi-tools compile .\\MOH -format PBIT');
        terminal.show();
    });

    // Register the new commands
    context.subscriptions.push(extractWatch);
    context.subscriptions.push(extractFile);
    context.subscriptions.push(compileFolder);

    // Example "Hello World" command remains here
    const disposable = vscode.commands.registerCommand('pbi-tools.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from pbi-tools!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

