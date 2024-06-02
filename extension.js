const vscode = require('vscode');

function activate(context) {
	// The runMumax command is referenced in the package.json file
	let disposable = vscode.commands.registerCommand('mumax3-highlighter.runMumax', function () {
		const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No file is currently open.');
            return;
        }
        const filename = editor.document.fileName;
		// Check if the file has a .mx3 extension
		if (!filename.endsWith('.mx3')) {
			vscode.window.showErrorMessage('The file is not a .mx3 file.');
			return;
		}
        // Check if there is an active terminal
        let terminal = vscode.window.activeTerminal;
        if (!terminal) {terminal = vscode.window.createTerminal('mumax3 Terminal')}
        // Show the terminal and send the command
        terminal.show();
        terminal.sendText(`mumax3 "${filename}"`);
	});

	context.subscriptions.push(disposable); // Add to context subscriptions to ensure proper cleanup
}

function deactivate() {
    // This function is optional and can be used for cleanup when your extension is deactivated
}

module.exports = {
	activate,
	deactivate
};
