import * as vscode from 'vscode';
import { detectPasswords } from './detector'; // 导入 detectPasswords

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "keyscannerwjerry" is now active!');

    // 创建红色边框装饰器
    const decorationType = vscode.window.createTextEditorDecorationType({
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'red'
    });

    function updateDecorations(editor: vscode.TextEditor | undefined) {
        if (!editor) return;
        const text = editor.document.getText();
        const ranges = detectPasswords(text);
        editor.setDecorations(decorationType, ranges);
    }

    // 监听文档打开
    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateDecorations(editor);
    }, null, context.subscriptions);

    // 监听文档修改
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    // 初始更新装饰
    updateDecorations(vscode.window.activeTextEditor);
}

// 扩展停用时清除装饰器
export function deactivate() {}
