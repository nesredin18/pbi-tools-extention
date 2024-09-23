import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import AdmZip from 'adm-zip';
import * as https from 'https';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "pbi-tools" is now active!');

    // Register the setupPbiTools command
    const setupCommand = vscode.commands.registerCommand('pbi-tools.setup', async () => {
        await setupPbiTools();
    });
    context.subscriptions.push(setupCommand);

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

    // Example "Hello World" command remains here
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

        // Set the HTML content for the webview
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
                case 'setupPbiTools':  // Add this case
                    vscode.commands.executeCommand('pbi-tools.setup');
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
                <button id="setupPbiTools">Setup PBI Tools</button>

                <script>
                    const vscode = acquireVsCodeApi();

                    // Existing button event listeners
                    document.getElementById('extractFile').addEventListener('click', () => {
                        vscode.postMessage({ command: 'extractFile' });
                    });

                    document.getElementById('compileFolder').addEventListener('click', () => {
                        vscode.postMessage({ command: 'compileFolder' });
                    });

                    document.getElementById('extractWatch').addEventListener('click', () => {
                        vscode.postMessage({ command: 'extractWatch' });
                    });

                    // Add event listener for the new "Setup PBI Tools" button
                    document.getElementById('setupPbiTools').addEventListener('click', () => {
                        vscode.postMessage({ command: 'setupPbiTools' });
                    });
                </script>
            </body>
            </html>
        `;
    }
}

// Function to execute `pbi-tools info` command and return parsed JSON result
async function getPbiToolsInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
        exec('pbi-tools info', (error, stdout) => {
            if (error) {
                reject(`Error running pbi-tools info: ${error}`);
                return;
            }

            try {
                const jsonStartIndex = stdout.indexOf('{');
                if (jsonStartIndex === -1) {
                    reject('Could not find JSON data in pbi-tools info output.');
                    return;
                }
                const jsonString = stdout.substring(jsonStartIndex);
                const result = JSON.parse(jsonString);
                resolve(result);
            } catch (jsonError) {
                reject(`Error parsing JSON from pbi-tools info: ${jsonError}`);
            }
        });
    });
}

// Register Command for: pbi-tools extract - extract the single .pbix file
const extractFile = async () => {
    const pbixFileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'Power BI Files': ['pbix'] },
        openLabel: 'Select PBIX file to extract'
    });

    if (!pbixFileUri || pbixFileUri.length === 0) {
        vscode.window.showErrorMessage('No PBIX file selected. Please select a PBIX file.');
        return;
    }

    const pbixFile = pbixFileUri[0].fsPath;

    const terminal = vscode.window.createTerminal('pbi-tools');
    terminal.sendText(`pbi-tools extract "${pbixFile}"`);
    terminal.show();
};

// Register Command for: pbi-tools compile
const compileFolder = async () => {
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select folder to compile'
    });

    if (!folderUri || folderUri.length === 0) {
        vscode.window.showErrorMessage('No folder selected. Please select a folder to compile.');
        return;
    }

    const folderToCompile = folderUri[0].fsPath;

    if (!fs.existsSync(folderToCompile)) {
        vscode.window.showErrorMessage(`Folder "${folderToCompile}" not found.`);
        return;
    }

    const terminal = vscode.window.createTerminal('pbi-tools');
    terminal.sendText(`pbi-tools compile "${folderToCompile}" -format PBIT -overwrite`);
    terminal.show();
};

// Register Command for: pbi-tools extract -pid id -watch
const extractWatch = async () => {
    const pbixFileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'Power BI Files': ['pbix'] },
        openLabel: 'Select PBIX file'
    });

    if (!pbixFileUri || pbixFileUri.length === 0) {
        vscode.window.showErrorMessage('No PBIX file selected. Please select a PBIX file.');
        return;
    }

    const pbixFile = pbixFileUri[0].fsPath;

    try {
        const infoResult = await getPbiToolsInfo();
        const pbixFileLowerCase = pbixFile.toLowerCase();

        const matchingSession = infoResult.pbiSessions.find((session: any) => session.PbixPath.toLowerCase() === pbixFileLowerCase);
        if (!matchingSession) {
            vscode.window.showErrorMessage(`The PBIX file "${pbixFile}" is not currently launched in Power BI Desktop.`);
            return;
        }

        const processId = matchingSession.ProcessId;

        const terminal = vscode.window.createTerminal('pbi-tools');
        terminal.sendText(`pbi-tools extract -pid ${processId} -watch`);
        terminal.show();
    } catch (error) {
        vscode.window.showErrorMessage(`Error during pbi-tools info or extraction: ${error}`);
    }
};

// Function to download and extract pbi-tools and set environment variable
async function setupPbiTools(): Promise<void> {
    const downloadUrl = 'https://github.com/pbi-tools/pbi-tools/releases/download/1.0.1/pbi-tools.1.0.1.zip';
    const toolsDir = 'C:\\Tools\\pbi-tools';
    const zipFilePath = path.join(toolsDir, 'pbi-tools.zip');

    try {
        const isPbiToolsInstalled = await checkPbiToolsInstallation();
        if (isPbiToolsInstalled) {
            vscode.window.showInformationMessage('pbi-tools is already installed.');
            return;
        }

        if (!fs.existsSync(toolsDir)) {
            fs.mkdirSync(toolsDir, { recursive: true });
        }

        await downloadFile(downloadUrl, zipFilePath);
        vscode.window.showInformationMessage('Downloaded pbi-tools. Extracting...');

        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(toolsDir, true);
        vscode.window.showInformationMessage('Extracted pbi-tools to C:\\Tools\\pbi-tools');

        await setEnvironmentVariable('PATH', toolsDir);

        const action = await vscode.window.showInformationMessage('pbi-tools setup complete! Please reload VS Code to apply the changes.', 'Reload');
        if (action === 'Reload') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to set up pbi-tools: ${error instanceof Error ? error.message : 'Unknown error.'}`);
    }
}

async function checkPbiToolsInstallation(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        exec('pbi-tools info', (error, stdout, stderr) => {
            if (error) {
                if (stderr.includes('not recognized') || error.message.includes('not recognized')) {
                    resolve(false);
                } else {
                    reject(new Error(`Unexpected error: ${error.message}`));
                }
            } else {
                resolve(true);
            }
        });
    });
}

// Function to download a file from the internet and handle redirects
function downloadFile(url: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);

        const request = (url: string) => {
            https.get(url, (response) => {
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    const redirectUrl = response.headers.location;
                    vscode.window.showInformationMessage(`Redirecting to ${redirectUrl}`);
                    request(redirectUrl);
                    return;
                }

                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }).on('error', (err) => {
                fs.unlink(destination, () => reject(err));
            });
        };

        request(url);
    });
}

function setEnvironmentVariable(variable: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(`setx ${variable} "%${variable}%;${value}"`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Failed to set environment variable: ${stderr}`));
            } else {
                resolve();
            }
        });
    });
}

export function deactivate() {}
