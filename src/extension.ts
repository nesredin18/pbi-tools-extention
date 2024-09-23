import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';


export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "pbi-tools" is now active!');

    // Register Webview View Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('pbiToolsView', new PbiToolsWebviewProvider(context))
    );
	console.log('Registered Webview View Provider');

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pbi-tools.extractFile', extractFile)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('pbi-tools.compileFolder', compileFolder)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('pbi-tools.extractWatch', extractWatch)
    );

    // Example "Hello World" command
    const disposable = vscode.commands.registerCommand('pbi-tools.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from pbi-tools!');
    });
    context.subscriptions.push(disposable);
}


class PbiToolsWebviewProvider implements vscode.WebviewViewProvider {
    private readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
		console.log('PbiToolsWebviewProvider initialized');
        this.context = context;
    }

    resolveWebviewView(webviewView: vscode.WebviewView) {
		console.log('resolveWebviewView called'); 
        webviewView.webview.options = {
            enableScripts: true // Enable JavaScript in the Webview
        };

		// HTML content for the webview (your existing code here, ensure proper formatting)
		webviewView.webview.html = this.getWebviewContent();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message) => {
			console.log('Received message:', message);
            switch (message.command) {
                case 'extractFile':
                    vscode.commands.executeCommand('pbi-tools.extractFile');
                    break;
                case 'compileFolder':
                    vscode.commands.executeCommand('pbi-tools.compileFolder');
                    break;
                case 'extractWatch':
                    vscode.commands.executeCommand('pbi-tools.extractWatch');
                    break;
            }
        });
    }
	

    private getWebviewContent(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PBI Tools</title>
                <style>
                    body { font-family: sans-serif; padding: 10px; }
                    button { margin-bottom: 10px; padding: 10px; width: 100%; font-size: 14px; }
                </style>
            </head>
            <body>
                <h2>PBI Tools</h2>
                <button id="extractFile">Extract</button>
                <button id="compileFolder">Compile</button>
                <button id="extractWatch">Extract and Watch</button>

                <script>
                    const vscode = acquireVsCodeApi();

                    document.getElementById('extractFile').addEventListener('click', () => {
                        vscode.postMessage({ command: 'extractFile' });
                    });

                    document.getElementById('compileFolder').addEventListener('click', () => {
                        vscode.postMessage({ command: 'compileFolder' });
                    });

                    document.getElementById('extractWatch').addEventListener('click', () => {
                        vscode.postMessage({ command: 'extractWatch' });
                    });
                </script>
            </body>
            </html>
        `;
    }
}





    // Function to get .pbix files in the current workspace folder
    function getPbixFiles(): string[] {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return [];
        }

        // Get all .pbix files in the workspace folder
        const pbixFiles = fs.readdirSync(workspaceFolder)
            .filter(file => file.endsWith('.pbix'))
            .map(file => path.join(workspaceFolder, file));

        return pbixFiles;
    }

    // Function to check if there is exactly one .pbix file
    function validateSinglePbixFile(): string | null {
        const pbixFiles = getPbixFiles();

        if (pbixFiles.length === 0) {
            vscode.window.showErrorMessage('No .pbix file found in the workspace.');
            return null;
        }

        if (pbixFiles.length > 1) {
            vscode.window.showErrorMessage('Multiple .pbix files found. Please ensure only one .pbix file is present.');
            return null;
        }

        return pbixFiles[0];  // Return the single .pbix file path
    }

    // Function to execute `pbi-tools info` command and return parsed JSON result
    function getPbiToolsInfo(): Promise<any> {
        return new Promise((resolve, reject) => {
            exec('pbi-tools info', (error, stdout) => {
                if (error) {
                    reject(`Error running pbi-tools info: ${error}`);
                    return;
                }

                try {
                    // Find the start of the JSON object by looking for the first `{` character
                    const jsonStartIndex = stdout.indexOf('{');
                    if (jsonStartIndex === -1) {
                        reject('Could not find JSON data in pbi-tools info output.');
                        return;
                    }

                    // Extract and parse the JSON portion
                    const jsonString = stdout.substring(jsonStartIndex);
                    const result = JSON.parse(jsonString);
                    resolve(result);
                } catch (jsonError) {
                    reject(`Error parsing JSON from pbi-tools info: ${jsonError}`);
                }
            });
        });
    }
	const extractFile = () => {
		vscode.window.showInformationMessage('Extract file command executed');
		const pbixFile = validateSinglePbixFile();
	
		if (pbixFile) {
			const terminal = vscode.window.createTerminal('pbi-tools');
			terminal.sendText(`pbi-tools extract "${pbixFile}"`);
			terminal.show();
		}
	};
	
	const compileFolder = () => {
		vscode.window.showInformationMessage('Compile folder command executed');
		const pbixFile = validateSinglePbixFile();
	
		if (pbixFile) {
			const pbixFileName = path.basename(pbixFile, '.pbix'); // Get the filename without extension
			const workspaceFolder = path.dirname(pbixFile);
	
			const folderToCompile = path.join(workspaceFolder, pbixFileName);
	
			// Check if the folder exists
			if (!fs.existsSync(folderToCompile)) {
				vscode.window.showErrorMessage(`Folder "${pbixFileName}" not found. Expected folder with the same name as the .pbix file.`);
				return;
			}
	
			const terminal = vscode.window.createTerminal('pbi-tools');
			terminal.sendText(`pbi-tools compile "${folderToCompile}" -format PBIT -overwrite`);
			terminal.show();
		}
	};
	
	const extractWatch = async () => {
		vscode.window.showInformationMessage('Extract and watch command executed');
		const pbixFile = validateSinglePbixFile();
	
		if (!pbixFile) {
			return; // If no valid .pbix file, exit early
		}
	
		try {
			// Get the result of `pbi-tools info`
			const infoResult = await getPbiToolsInfo();
	
			// Get directory of the current .pbix file
			const pbixFileDirectory = path.dirname(pbixFile);
			const pbixFileLowerCase = pbixFile.toLowerCase();
	
			// Find the matching session for the .pbix file
			const matchingSession = infoResult.pbiSessions.find(
				(session: any) => session.PbixPath.toLowerCase() === pbixFileLowerCase
			);
	
			if (!matchingSession) {
				vscode.window.showErrorMessage(`The PBIX file "${pbixFile}" is not currently launched in Power BI Desktop.`);
				return;
			}
	
			const processId = matchingSession.ProcessId;
	
			// Run the extract command with the found pid
			const terminal = vscode.window.createTerminal('pbi-tools');
			terminal.sendText(`pbi-tools extract -pid ${processId} -watch`);
			terminal.show();
	
		} catch (error) {
			vscode.window.showErrorMessage(`Error during pbi-tools info or extraction: ${error}`);
		}
	};
	
	

export function deactivate() {}
