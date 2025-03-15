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
                '跳转', '删除密钥', '替换为全局变量'
            ).then(selection => {
                if (!selection){
                    return;
                }
                const firstMatchRange = ranges[0];

                if (selection === '跳转') {
                    editor.revealRange(firstMatchRange, vscode.TextEditorRevealType.InCenter);
                    editor.selection = new vscode.Selection(firstMatchRange.start, firstMatchRange.end);
                } else if (selection === '删除密钥') {
                    replaceFirstKey(editor, firstMatchRange);
                } else if (selection === '替换为全局变量') {
                    replaceWithEnvVariable(editor, firstMatchRange);
                }
            });
        }
    }

    function replaceFirstKey(editor: vscode.TextEditor, range: vscode.Range) {
        const document = editor.document;
        const fullText = document.getText(range);
    
        // 找到 `=` 或 `:` 的位置
        const equalIndex = fullText.indexOf('=');
        const colonIndex = fullText.indexOf(':');
    
        let separatorIndex = -1;
    
        if (equalIndex !== -1 && colonIndex !== -1) {
            // 如果同时存在 `=` 和 `:`，取最先出现的一个
            separatorIndex = Math.min(equalIndex, colonIndex);
        } else {
            // 只存在 `=` 或 `:`，取存在的那个
            separatorIndex = equalIndex !== -1 ? equalIndex : colonIndex;
        }
    
        let newText = '// Please put your key here'; // 默认情况下，删除整个密钥
    
        if (separatorIndex !== -1) {
            // 如果有 `=` 或 `:`，保留 `key=` 或 `key:`，后面替换为注释
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
        const languageId = document.languageId; // 获取当前文件的语言
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
    
        // 根据语言选择环境变量的写法
        let replacementText = '';
    
        switch (languageId) {
            case 'javascript':
            case 'typescript':
                replacementText = `process.env.${envVarName}`;
                break;
            case 'python':
                replacementText = `os.getenv('${envVarName}')`;
                break;
            case 'go':
                replacementText = `os.Getenv("${envVarName}")`;
                break;
            case 'java':
                replacementText = `System.getenv("${envVarName}")`;
                break;
            case 'csharp':
                replacementText = `Environment.GetEnvironmentVariable("${envVarName}")`;
                break;
            case 'php':
                replacementText = `getenv('${envVarName}')`;
                break;
            case 'ruby':
                replacementText = `ENV['${envVarName}']`;
                break;
            default:
                replacementText = `process.env.${envVarName}`; // 默认使用 JavaScript 方式
                break;
        }
    
        // 替换代码中的密钥为相应的全局变量写法
        editor.edit(editBuilder => {
            editBuilder.replace(range, replacementText);
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
