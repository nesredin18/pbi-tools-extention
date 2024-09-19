import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "pbi-tools" is now active!');

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
	    // Register Command for: pbi-tools extract - extract the single .pbix file
		const extractFile = vscode.commands.registerCommand('pbi-tools.extractFile', () => {
			const pbixFile = validateSinglePbixFile();
	
			if (pbixFile) {
				const terminal = vscode.window.createTerminal('pbi-tools');
				terminal.sendText(`pbi-tools extract "${pbixFile}"`);
				terminal.show();
			}
		});

		    // Register Command for: pbi-tools compile
			const compileFolder = vscode.commands.registerCommand('pbi-tools.compileFolder', () => {
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
			});

    // Register Command for: pbi-tools extract -pid id -watch
    const extractWatch = vscode.commands.registerCommand('pbi-tools.extractWatch', async () => {
        const pbixFile = validateSinglePbixFile();

        if (!pbixFile) {
            return; // If no valid .pbix file, exit early
        }

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

export function deactivate() {}
