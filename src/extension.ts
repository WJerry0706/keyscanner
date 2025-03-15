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
        if (!editor) {
            return;
        }
        const text = editor.document.getText();
        const ranges = detectPasswords(text);
        editor.setDecorations(decorationType, ranges);

        // 如果找到潜在的密钥，触发警告通知
        if (ranges.length > 0) {
            vscode.window.showWarningMessage(
                '潜在密钥已检测到！点击跳转到第一个匹配位置。',
                '跳转',
            ).then(selection => {
                if (selection === '跳转') {
                    const firstMatchRange = ranges[0];
                    // 跳转到第一个匹配位置
                    editor.revealRange(firstMatchRange, vscode.TextEditorRevealType.InCenter);
                    editor.selection = new vscode.Selection(firstMatchRange.start, firstMatchRange.end);
                }
            });
        }
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
