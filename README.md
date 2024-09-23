# PBI Tools - VS Code Extension

![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/<publisher>.<extension-id>?label=version)
(https://marketplace.visualstudio.com/items?itemName=Nesrunas.pbi-tools)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/<publisher>.<extension-id>?label=installs)
(https://marketplace.visualstudio.com/items?itemName=Nesrunas.pbi-tools)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/<publisher>.<extension-id>?label=downloads)
(https://marketplace.visualstudio.com/items?itemName=Nesrunas.pbi-tools)

## Overview

`PBI Tools` is a Visual Studio Code extension designed to automate Power BI version control processes directly from your code editor. This tool provides commands to extract data, compile Power BI files, and watch for changes — all from within VS Code.

## Features
- **Setup Pbi-tools**:Automatically downloads, extracts pbi-tools, and registers it to the environment variable.
- **Extract and Watch**: Automatically extracts Power BI reports and watches for changes with a simple command.
- **Extract File**: Quickly extract data from a specific `.pbix` Power BI file.
- **Compile Folder**: Compile a folder containing Power BI resources into a `.pbit` file format.
- **Hello World Command**: A sample command to demonstrate how the extension works.

## Commands

This extension registers several commands that can be accessed via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) or bound to custom keybindings:

- `PBI Tools: Setup`(`pbi-tools.setup`): Automatically sets up pbi-tools by downloading and extracting the necessary files and registering the tool to your environment.
- `PBI Tools: Extract and Watch` (`pbi-tools.extractWatch`): Automatically extract Power BI data and watch for file changes.
- `PBI Tools: Extract` (`pbi-tools.extractFile`): Extract a specific `.pbix` file (default is `MOH.pbix`).
- `PBI Tools: Compile Folder to PBIT` (`pbi-tools.compileFolder`): Compile a folder into a `.pbit` file format.
- `PBI Tools: Hello World` (`pbi-tools.helloWorld`): Display a simple message to test the extension.

## Installation

### From the Visual Studio Code Marketplace

1. Open VS Code.
2. Go to the Extensions view by clicking the Extensions icon in the Activity Bar or pressing `Ctrl+Shift+X`.
3. Search for `PBI Tools`.
4. Click **Install**.

### From a VSIX File

1. Download the latest `.vsix` file from the [Releases](https://github.com/nesredin18/pbi-tools-extention/releases) page.
2. Open VS Code.
3. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and type `Extensions: Install from VSIX...`.
4. Select the downloaded `.vsix` file.

## Usage

1. **Extract and Watch**: Open the Command Palette (`Ctrl+Shift+P`), type `PBI Tools: Extract and Watch`, and select the command. This will extract Power BI data and monitor the file for changes.
2. **Extract File**: Open the Command Palette, search for `PBI Tools: Extract`, and extract the file.
3. **Compile Folder**: Open the Command Palette, search for `PBI Tools: Compile Folder to PBIT`, and select the folder to compile it into a `.pbit` format.
4. **Hello World**: Test the extension by running the `PBI Tools: Hello World` command.

## Icon

The extension icon is stored in the `resources` folder and is used in the Visual Studio Marketplace and within VS Code to represent this extension.

## Development

To work on the extension locally:

1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Press `F5` to start a new VS Code window with the extension running in development mode.

### Packaging and Publishing

To package and publish the extension:

1. Make sure you have [VSCE](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) installed:

   ```bash
   npm install -g vsce

## License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for details.

