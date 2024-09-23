import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import AdmZip from 'adm-zip';
import * as https from 'https';

export  function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "pbi-tools" is now active!');


        // Register the setupPbiTools command
        const setupCommand = vscode.commands.registerCommand('pbi-tools.setup', async () => {
            await setupPbiTools();
        });
    
        // Push the registered command to the context's subscriptions
        context.subscriptions.push(setupCommand);



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
    // Register Command for: pbi-tools extract - extract the single .pbix file
    const extractFile = vscode.commands.registerCommand('pbi-tools.extractFile', async () => {
        // Open file picker for the user to select a .pbix file
        const pbixFileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: { 'Power BI Files': ['pbix'] }, // Restrict to .pbix files
            openLabel: 'Select PBIX file to extract'
        });

        // Check if the user selected a file
        if (!pbixFileUri || pbixFileUri.length === 0) {
            vscode.window.showErrorMessage('No PBIX file selected. Please select a PBIX file.');
            return;
        }

        const pbixFile = pbixFileUri[0].fsPath;

        // Run the extract command in the terminal
        const terminal = vscode.window.createTerminal('pbi-tools');
        terminal.sendText(`pbi-tools extract "${pbixFile}"`);
        terminal.show();
    });


    // Register Command for: pbi-tools compile
    const compileFolder = vscode.commands.registerCommand('pbi-tools.compileFolder', async () => {

        // Open folder picker for the user to choose a folder
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select folder to compile'
        });

        // Check if the user selected a folder
        if (!folderUri || folderUri.length === 0) {
            vscode.window.showErrorMessage('No folder selected. Please select a folder to compile.');
            return;
        }

        const folderToCompile = folderUri[0].fsPath;

        // Check if the folder exists
        if (!fs.existsSync(folderToCompile)) {
            vscode.window.showErrorMessage(`Folder "${folderToCompile}" not found.`);
            return;
        }

        // Run the pbi-tools compile command in the terminal
        const terminal = vscode.window.createTerminal('pbi-tools');
        terminal.sendText(`pbi-tools compile "${folderToCompile}" -format PBIT -overwrite`);
        terminal.show();
    });


    // Register Command for: pbi-tools extract -pid id -watch
    const extractWatch = vscode.commands.registerCommand('pbi-tools.extractWatch', async () => {
        // Open file picker for the user to select a .pbix file
        const pbixFileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: { 'Power BI Files': ['pbix'] }, // Restrict to .pbix files
            openLabel: 'Select PBIX file'
        });

        // Check if the user selected a file
        if (!pbixFileUri || pbixFileUri.length === 0) {
            vscode.window.showErrorMessage('No PBIX file selected. Please select a PBIX file.');
            return;
        }

        const pbixFile = pbixFileUri[0].fsPath;

        try {
            // Get the result of `pbi-tools info`
            const infoResult = await getPbiToolsInfo();

            // Get directory of the current .pbix file
            const pbixFileDirectory = path.dirname(pbixFile);
            
            // Convert both the PBIX file path and session paths to lowercase for comparison
            const pbixFileLowerCase = pbixFile.toLowerCase();

            // Find the matching session for the .pbix file
            const matchingSession = infoResult.pbiSessions.find((session: any) => session.PbixPath.toLowerCase() === pbixFileLowerCase);
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

// Function to download and extract pbi-tools and set environment variable
export async function setupPbiTools(): Promise<void> {
    const downloadUrl = 'https://github.com/pbi-tools/pbi-tools/releases/download/1.0.1/pbi-tools.1.0.1.zip';
    const toolsDir = 'C:\\Tools\\pbi-tools';
    const zipFilePath = path.join(toolsDir, 'pbi-tools.zip');

    try {
        // Check if pbi-tools is already installed by running `pbi-tools info`
        const isPbiToolsInstalled = await checkPbiToolsInstallation();
        if (isPbiToolsInstalled) {
            vscode.window.showInformationMessage('pbi-tools is already installed.');
            return; // Skip installation if already installed
        }

        // If pbi-tools folder does not exist, create it
        if (!fs.existsSync(toolsDir)) {
            fs.mkdirSync(toolsDir, { recursive: true });
        }

        // Download the zip file
        await downloadFile(downloadUrl, zipFilePath);
        vscode.window.showInformationMessage('Downloaded pbi-tools. Extracting...');

        // Extract the zip file
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(toolsDir, true);
        vscode.window.showInformationMessage('Extracted pbi-tools to C:\\Tools\\pbi-tools');

        // Set environment variable
        await setEnvironmentVariable('PATH', toolsDir);

        // Notify the user to reload the window to apply the change
        vscode.window.showInformationMessage('pbi-tools setup complete! Please reload VS Code to apply the changes.');
        const action = await vscode.window.showInformationMessage('Would you like to reload the window?', 'Reload');
        if (action === 'Reload') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } catch (error) {
        // Type-safe handling of the 'unknown' error
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to set up pbi-tools: ${error.message}`);
        } else {
            vscode.window.showErrorMessage('Failed to set up pbi-tools due to an unknown error.');
        }
    }
}

// Function to check if pbi-tools is installed by running `pbi-tools info`
async function checkPbiToolsInstallation(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        exec('pbi-tools info', (error, stdout, stderr) => {
            if (error) {
                // If pbi-tools is not found or returns error, resolve as false
                if (stderr.includes('not recognized') || error.message.includes('not recognized')) {
                    resolve(false); // pbi-tools not installed
                } else {
                    reject(new Error(`Unexpected error: ${error.message}`));
                }
            } else {
                resolve(true); // pbi-tools installed
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
                // Handle redirection (status codes 301, 302, 303, 307, 308)
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    const redirectUrl = response.headers.location;
                    vscode.window.showInformationMessage(`Redirecting to ${redirectUrl}`);
                    request(redirectUrl); // Follow the redirect
                    return;
                }

                // Check for a successful response
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                }

                // Pipe the response data to the file
                response.pipe(file);

                // Close the file after download finishes and then resolve
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
                // Handle download error, remove incomplete file
                fs.unlink(destination, () => reject(err));
            });
        };

        request(url); // Start the request
    });
}

// Function to set an environment variable
function setEnvironmentVariable(variable: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Add the directory to the PATH environment variable
        exec(`setx ${variable} "%${variable}%;${value}"`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Failed to set environment variable: ${stderr}`));
                return;
            }
            resolve();
        });
    });
}

export function deactivate() {}
