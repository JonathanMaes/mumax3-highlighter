const vscode = require('vscode');
const api = require('./data/mumax3_api.json');


// const log = vscode.window.createOutputChannel("mumax³ highlighter debug channel"); // For debug purposes during development

function activate(context) {
	// The runMumax command is referenced in the package.json file
	context.subscriptions.push(vscode.commands.registerCommand('mumax3-highlighter.runMumax', function () {
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
	})); // Add to context subscriptions to ensure proper cleanup

    // --- AUTOCOMPLETE PROVIDER FOR FUNCTIONS AND VARIABLES ---
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        { language: 'mumax3' },
        {
            provideCompletionItems(document, position, token, context) {
                let items = [];

                for (let [funcname, funcobj] of Object.entries(api.functions)) {
                    const item = new vscode.CompletionItem(funcname, vscode.CompletionItemKind.Function);
                    item.detail = funcobj.signature;
                    item.documentation = new vscode.MarkdownString(funcobj.description);
                    items.push(item);
                }
                
                for (let [varname, varobj] of Object.entries(api.variables)) {
                    const item = new vscode.CompletionItem(varname, vscode.CompletionItemKind.Variable);
                    item.detail = varobj.signature;
                    item.documentation = new vscode.MarkdownString(varobj.description);
                    items.push(item);
                }

                return items;
            }
        }
    ));

    // -- AUTOCOMPLETE PROVIDER FOR METHODS (so only after typing "Identifier.") --
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        { language: 'mumax3' },
        {
            provideCompletionItems(document, position, token, context) {
                // Detect pattern "Identifier(args)." before cursor
                const line = document.lineAt(position.line).text;
                const beforeCursor = line.substring(0, position.character);
                const match = beforeCursor.match(/([A-Za-z_][A-Za-z0-9_]*)(?:\([^()]*\))?\.$/);
                if (!match) {return [];} // Only do method completion if writing a method followed by dot
                const objectName = match[1]; // always the identifier only

                // Build completion items
                let items = [];

                for (let [methname, methobj] of Object.entries(api.methods)) {
                    const methodReceivers = new Set(methobj.usedby.map(x => x.toLowerCase()));
                    if (objectName && methodReceivers.has(objectName.toLowerCase())) {
                        const item = new vscode.CompletionItem(methname, vscode.CompletionItemKind.Method);
                        item.detail = methobj.signature;
                        item.documentation = new vscode.MarkdownString(methobj.description);
                        items.push(item);
                    }
                }
                return items
            }
        },
        '.'  // trigger character, since these are methods
    ));


    // --- HOVER PROVIDER ---
    context.subscriptions.push(vscode.languages.registerHoverProvider(
        { language: 'mumax3' },
        {
            provideHover(document, position, token) {
                const word = document.getText(document.getWordRangeAtPosition(position));
                for (const [name, obj] of [].concat(Object.entries(api.functions), Object.entries(api.variables), Object.entries(api.methods))) {
                    if (word.toLowerCase() === name.toLowerCase()) {
                        return new vscode.Hover(new vscode.MarkdownString(`## \`${obj.signature}\`\n\n` + obj.description));
                    }
                }
                return undefined;
            }
        }
    ));
}

function deactivate() {
    // This function is optional and can be used for cleanup when your extension is deactivated
}

module.exports = {
	activate,
	deactivate
};
