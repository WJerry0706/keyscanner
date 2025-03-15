import * as vscode from 'vscode';
import { detectPasswords } from './detector'; // 导入 detectPasswords
import * as fs from 'fs';
import * as path from 'path';

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

        if (ranges.length > 0) {
            vscode.window.showWarningMessage(
                '潜在密钥已检测到！选择一个操作：',
                '跳转', '替换密钥', '替换为全局变量'
            ).then(selection => {
                if (!selection) return;
                const firstMatchRange = ranges[0];

                if (selection === '跳转') {
                    editor.revealRange(firstMatchRange, vscode.TextEditorRevealType.InCenter);
                    editor.selection = new vscode.Selection(firstMatchRange.start, firstMatchRange.end);
                } else if (selection === '替换密钥') {
                    replaceFirstKey(editor, firstMatchRange);
                } else if (selection === '替换为全局变量') {
                    replaceWithEnvVariable(editor, firstMatchRange);
                }
            });
        }
    }

    function replaceFirstKey(editor: vscode.TextEditor, range: vscode.Range) {
        editor.edit(editBuilder => {
            editBuilder.replace(range, '"REDACTED_SECRET"');
        }).then(success => {
            if (success) {
                vscode.window.showInformationMessage('密钥已被替换为无用字符串。');
            } else {
                vscode.window.showErrorMessage('密钥替换失败。');
            }
        });
    }

    function replaceWithEnvVariable(editor: vscode.TextEditor, range: vscode.Range) {
        const document = editor.document;
        const secretValue = document.getText(range).match(/["']([^"']+)["']/)?.[1] || '';

        if (!secretValue) {
            vscode.window.showErrorMessage('无法提取密钥值。');
            return;
        }

        // 生成环境变量名称
        const envVarName = `MY_SECRET_${Math.floor(Math.random() * 10000)}`.toUpperCase();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            vscode.window.showErrorMessage('请在一个工作区中打开文件。');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const envFilePath = path.join(workspaceRoot, '.env');
        const gitignorePath = path.join(workspaceRoot, '.gitignore');

        // 替换代码中的密钥为 `process.env.ENV_VAR`
        editor.edit(editBuilder => {
            editBuilder.replace(range, `process.env.${envVarName}`);
        }).then(success => {
            if (!success) {
                vscode.window.showErrorMessage('替换环境变量失败。');
                return;
            }

            // 写入 .env 文件
            fs.appendFileSync(envFilePath, `\n${envVarName}=${secretValue}\n`, { encoding: 'utf8' });

            // 确保 .gitignore 存在，并添加 .env 规则
            if (!fs.existsSync(gitignorePath)) {
                fs.writeFileSync(gitignorePath, '.env\n', { encoding: 'utf8' });
            } else {
                const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
                if (!gitignoreContent.includes('.env')) {
                    fs.appendFileSync(gitignorePath, '\n.env\n', { encoding: 'utf8' });
                }
            }

            vscode.window.showInformationMessage(`密钥已替换为全局变量 ${envVarName} 并存储在 .env 文件中！`);
        });
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateDecorations(editor);
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    updateDecorations(vscode.window.activeTextEditor);
}

export function deactivate() {}
