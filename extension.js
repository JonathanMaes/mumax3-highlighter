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

    // --- AUTOCOMPLETE PROVIDER ---
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        { language: 'mumax3' },
        {
            provideCompletionItems(document, position, token, context) {
                let items = [];

                const wordRange = document.getWordRangeAtPosition(position);
                const beforeStr = document.lineAt(position.line).text.substring(0, wordRange ? wordRange.start.character : position.character);
                const methodReceiverMatch = beforeStr.match(/([A-Za-z_][A-Za-z0-9_]*)(?:\([^()]*\))?\.$/);

                if (!!methodReceiverMatch) { // Handle methods only
                    const objectName = methodReceiverMatch[1];
                    for (let [methname, methobj] of Object.entries(api.methods)) {
                        for (let methobjunique of methobj) {
                            const methodReceivers = new Set(methobjunique.usedby.map(x => x.toLowerCase()));
                            if (objectName && methodReceivers.has(objectName.toLowerCase())) {
                                const item = new vscode.CompletionItem(methname, vscode.CompletionItemKind.Method);
                                item.detail = methobjunique.signature;
                                item.documentation = new vscode.MarkdownString(methobjunique.description);
                                items.push(item);
                            }
                        }
                    }
                } else { // Handle functions and variables
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
                }

                return items;
            }
        },
        '.'
    ));


    // --- HOVER PROVIDER ---
    context.subscriptions.push(vscode.languages.registerHoverProvider(
        { language: 'mumax3' },
        {
            provideHover(document, position, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                if (!wordRange) return;
                const word = document.getText(wordRange);

                // Detect if we are hovering over a method or not
                const beforeWord = document.lineAt(position.line).text.substring(0, wordRange.start.character);
                const methodReceiverMatch = beforeWord.match(/([A-Za-z_][A-Za-z0-9_]*)(?:\([^()]*\))?\.$/);

                if (!!methodReceiverMatch) { // Handle methods only
                    const receiverName = methodReceiverMatch[1] // (e.g. "Aex" in Aex.EvalTo)
                    for (const [methodName, methodObj] of Object.entries(api.methods)) {
                        for (const methodObjUnique of methodObj) {
                            const methodRecognized = methodObjUnique.usedby.includes(receiverName) || methodObj.length == 1
                            if (methodRecognized && (word.toLowerCase() === methodName.toLowerCase())) {
                                return new vscode.Hover(
                                    new vscode.MarkdownString(
                                        `## \`${methodObjUnique.signature}\`\n\n${methodObjUnique.description}`
                                    )
                                );
                            }
                        }
                    }
                } else { // Handle functions and variables
                    for (const [name, obj] of [].concat(Object.entries(api.functions), Object.entries(api.variables))) {
                        if (word.toLowerCase() === name.toLowerCase()) {
                            return new vscode.Hover(
                                new vscode.MarkdownString(
                                    `## \`${obj.signature}\`\n\n${obj.description}`
                                )
                            );
                        }
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
