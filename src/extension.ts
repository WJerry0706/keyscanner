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

    let detectedKeysCount = 0;
    const ignoredSecrets = new Set<string>(); // 只保留忽略密钥功能

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `🔑 检测到密钥: 0`;
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    function updateDecorations(editor: vscode.TextEditor | undefined) {
        if (!editor) return;

        const text = editor.document.getText();
        let ranges = detectPasswords(text);

        // 过滤掉被忽略的密钥
        ranges = ranges.filter(range => {
            const secret = editor.document.getText(range);
            return !ignoredSecrets.has(secret);
        });

        // 更新状态栏统计
        detectedKeysCount += ranges.length;
        statusBarItem.text = `🔑 检测到密钥: ${detectedKeysCount}`;

        // 应用高亮
        editor.setDecorations(decorationType, ranges);

        if (ranges.length > 0) {
            vscode.window.showWarningMessage(
                `🔐 发现 ${ranges.length} 个潜在密钥! 请选择操作:`,
                '跳转', '删除密钥', '替换为全局变量', '忽略此密钥'
            ).then(selection => {
                if (!selection) return;
                const firstMatchRange = ranges[0];
                const secret = editor.document.getText(firstMatchRange);

                if (selection === '跳转') {
                    editor.revealRange(firstMatchRange, vscode.TextEditorRevealType.InCenter);
                    editor.selection = new vscode.Selection(firstMatchRange.start, firstMatchRange.end);
                } else if (selection === '删除密钥') {
                    replaceFirstKey(editor, firstMatchRange);
                } else if (selection === '替换为全局变量') {
                    replaceWithEnvVariable(editor, firstMatchRange);
                } else if (selection === '忽略此密钥') {
                    ignoredSecrets.add(secret);
                    vscode.window.showInformationMessage('该密钥已被忽略，不再检测。');
                    updateDecorations(editor);
                }
            });
        }
    }

    function replaceFirstKey(editor: vscode.TextEditor, range: vscode.Range) {
        const document = editor.document;
        const fullText = document.getText(range);
    
        const equalIndex = fullText.indexOf('=');
        const colonIndex = fullText.indexOf(':');
        let separatorIndex = Math.min(
            equalIndex !== -1 ? equalIndex : Infinity, 
            colonIndex !== -1 ? colonIndex : Infinity
        );

        let newText = '// Please put your key here';

        if (separatorIndex !== Infinity) {
            newText = fullText.substring(0, separatorIndex + 1) + '\n // Please put your key here';
        }
    
        editor.edit(editBuilder => {
            editBuilder.replace(range, newText);
        }).then(success => {
            if (success) {
                vscode.window.showInformationMessage('密钥已被删除，并替换为提示注释。');
            } else {
                vscode.window.showErrorMessage('密钥删除失败。');
            }
        });
    }    

    function replaceWithEnvVariable(editor: vscode.TextEditor, range: vscode.Range) {
        const document = editor.document;
        const languageId = document.languageId;
        const secretValue = document.getText(range).match(/["']([^"']+)["']/)?.[1] || '';

        if (!secretValue) {
            vscode.window.showErrorMessage('无法提取密钥值。');
            return;
        }

        const envVarName = `MY_SECRET_${Math.floor(Math.random() * 10000)}`.toUpperCase();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            vscode.window.showErrorMessage('请在一个工作区中打开文件。');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const envFilePath = path.join(workspaceRoot, '.env');
        const gitignorePath = path.join(workspaceRoot, '.gitignore');

        const envVarFormats: { [key: string]: string } = {
            'javascript': `process.env.${envVarName}`,
            'typescript': `process.env.${envVarName}`,
            'python': `os.getenv('${envVarName}')`,
            'go': `os.Getenv("${envVarName}")`,
            'java': `System.getenv("${envVarName}")`,
            'csharp': `Environment.GetEnvironmentVariable("${envVarName}")`,
            'php': `getenv('${envVarName}')`,
            'ruby': `ENV['${envVarName}']`
        };

        const replacementText = envVarFormats[languageId] || `process.env.${envVarName}`;

        editor.edit(editBuilder => {
            editBuilder.replace(range, replacementText);
        }).then(success => {
            if (!success) {
                vscode.window.showErrorMessage('替换环境变量失败。');
                return;
            }

            fs.appendFileSync(envFilePath, `\n${envVarName}=${secretValue}\n`, { encoding: 'utf8' });

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
