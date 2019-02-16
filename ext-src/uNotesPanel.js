"use strict";
Object.defineProperty(exports, "__esModule", {
  value: true
});

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let _currentPanel = null;

class UNotesPanel {

  static createOrShow(extensionPath){
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if(_currentPanel){
      _currentPanel.panel.reveal(column);
    } else {
      _currentPanel = new UNotesPanel(extensionPath, column || vscode.ViewColumn.One);
    }
  }

  static instance(){
    return _currentPanel;
  }

  constructor(extensionPath, column){
    try {
      this.extensionPath = extensionPath;
      this.disposables = [];
      this.reloadContent = false;
      this.currentNote = '';
      
      this.panel = vscode.window.createWebviewPanel('unotes', "UNotes", column, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, 'build'))
        ]
      });

      // Set the webview's initial html content
      this.panel.webview.html = this.getWebviewContent();

      // Listen for when the panel is disposed
      // This happens when the user closes the panel or when the panel is closed programatically
      this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

      // Handle messages from the webview
      this.panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
          case 'applyChanges':
            this.saveChanges(message.content)
            return;
          default:
            console.log("Unknown webview message received:")
            console.log(message)
        }
      }, null, this.disposables);

      this.panel.onDidChangeViewState(e => {
        if(e.webviewPanel._active){
          if(this.reloadContent){
            this.updateContents(this.currentNote);
            this.reloadContent = false;
          }
        }
      });

      // Register commands
      vscode.commands.registerCommand("unotes.heading.1", () => {
        this.hotkeyExec(['Heading', 1]);
      });
      vscode.commands.registerCommand("unotes.heading.2", () => {
        this.hotkeyExec(['Heading', 2]);
      });
      vscode.commands.registerCommand("unotes.heading.3", () => {
        this.hotkeyExec(['Heading', 3]);
      });
      vscode.commands.registerCommand("unotes.heading.4", () => {
        this.hotkeyExec(['Heading', 4]);
      });
      vscode.commands.registerCommand("unotes.heading.5", () => {
        this.hotkeyExec(['Heading', 5]);
      });
      vscode.commands.registerCommand("unotes.heading.6", () => {
        this.hotkeyExec(['Heading', 6]);
      });
      vscode.commands.registerCommand("unotes.normal", () => {
        this.hotkeyExec(['Paragraph']);
      });
      vscode.commands.registerCommand("unotes.bold", () => {
        this.hotkeyExec(['Bold']);
      });
      vscode.commands.registerCommand("unotes.italic", () => {
        this.hotkeyExec(['Italic']);
      });
      vscode.commands.registerCommand("unotes.strike", () => {
        this.hotkeyExec(['Strike']);
      });
      vscode.commands.registerCommand("unotes.task", () => {
        this.hotkeyExec(['Task']);
      });
      vscode.commands.registerCommand("unotes.ul", () => {
        this.hotkeyExec(['UL']);
      });
      vscode.commands.registerCommand("unotes.ol", () => {
        this.hotkeyExec(['OL']);
      });
      vscode.commands.registerCommand("unotes.blockquote", () => {
        this.hotkeyExec(['Blockquote']);
      });
      vscode.commands.registerCommand("unotes.code", () => {
        this.hotkeyExec(['Code']);
      });
      vscode.commands.registerCommand("unotes.codeblock", () => {
        this.hotkeyExec(['CodeBlock']);
      });
      vscode.commands.registerCommand("unotes.indent", () => {
        this.hotkeyExec(['Indent']);
      });
      vscode.commands.registerCommand("unotes.outdent", () => {
        this.hotkeyExec(['Outdent']);
      });
      vscode.commands.registerCommand("unotes.hr", () => {
        this.hotkeyExec(['HR']);
      });


    }
    catch (e) {
      console.log(e);
    }

  }

  hotkeyExec(args){
    if(this.panel._active){
      this.panel.webview.postMessage({ command: 'exec', args });
    }
  }

  saveChanges(content){
    if(this.currentNote){
      this.writingFile = this.currentNote;
      fs.writeFileSync(this.currentNote, content);
    }
  }

  showUNote(unote) {
    try {
      const filePath = path.join(vscode.workspace.rootPath, unote.folderPath, unote.label);
      this.currentNote = filePath;
      this.updateContents(filePath);
    }
    catch (e) {
      console.log(e);
    }
  }

  updateContents(filePath){
    try {
      const content = fs.readFileSync(filePath).toString('ascii');
      this.panel.webview.postMessage({ command: 'setContent', content });
    }
    catch (e){
      console.log(e);
    }
  }

  updateFileIfOpen(filePath) {
    // update our view if an external change happens
    if((this.currentNote == filePath) && (filePath != this.writingFile)){
        // if the view is active then load now else flag to reload on showing
      if(this.panel._active){
        this.updateContents(filePath);
      } else {
        console.log("setting reload");
        this.reloadContent = true;
      }    
      return true;
    } 
    this.writingFile = '';
    return false;
  }

  doRefactor() {
		// Send a message to the webview
		// You can send any JSON serializable data.
		this.panel.webview.postMessage({ command: 'refactor' });
  }
  
  dispose() {
		_currentPanel = undefined;

		// Clean up our resources
		this.panel.dispose();

		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
	  }
  }
  
  getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  getWebviewContent() {
    const vsScheme = { scheme: 'vscode-resource' };
		const manifest = require(path.join(this.extensionPath, 'build', 'asset-manifest.json'));
		const mainScript = manifest['main.js'];
		const mainStyle = manifest['main.css'];
    
		const scriptPathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'build', mainScript));
		const scriptUri = scriptPathOnDisk.with(vsScheme);
		const stylePathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'build', mainStyle));
    const styleUri = stylePathOnDisk.with(vsScheme);
    const baseUri = vscode.Uri.file(path.join(this.extensionPath, 'build')).with(vsScheme);
    
		// Use a nonce to whitelist which scripts can be run
    const nonce = this.getNonce();
    //<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https: data:; script-src 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' vscode-resource: data:;style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>UNotes</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: http: https: data:; script-src 'unsafe-inline' 'unsafe-eval' vscode-resource: data:;style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${baseUri}/">
			</head>

			<body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <script>
          (function() {
            window.vscode = acquireVsCodeApi();
          }())
        </script>
				<div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}

}
exports.UNotesPanel = UNotesPanel;