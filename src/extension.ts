import * as vscode from 'vscode';
import * as cp from 'child_process';
import { detectPasswords } from './detector';

export function activate(context: vscode.ExtensionContext) {
    console.log('🔍 VS Code Git Security Scanner Activated');

    // 监听 Git 提交事件
    let disposable = vscode.commands.registerCommand('extension.gitCommitCheck', async () => {
        try {
            // 1️⃣ 获取 Git 暂存区的文件
            const stagedFiles = getGitStagedFiles();
            if (stagedFiles.length === 0) {
                vscode.window.showInformationMessage("✅ 没有暂存的文件，无需检测");
                return;
            }

            // 2️⃣ 扫描暂存的文件内容
            const warnings: string[] = [];
            for (const file of stagedFiles) {
                const fileUri = vscode.Uri.file(file);
                const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                const content = Buffer.from(contentBytes).toString('utf8');

                const ranges = detectPasswords(content);
                if (ranges.length > 0) {
                    warnings.push(`🚨 文件 ${file} 包含敏感信息！`);
                }
            }

            // 3️⃣ 如果发现敏感信息，阻止提交并提供选项
            if (warnings.length > 0) {
                const userChoice = await vscode.window.showWarningMessage(
                    "⚠️ Git 提交检测到敏感信息，是否继续提交？",
                    "取消提交", "强制提交"
                );

                if (userChoice === "取消提交") {
                    vscode.window.showErrorMessage("❌ 提交已被阻止，请清除敏感信息后重试！");
                    return;
                }
                if (userChoice === "强制提交") {
                    vscode.window.showWarningMessage("⚠️ 你选择了强制提交，请确保无误！");
                }
            }

            // 继续 Git 提交
            commitChanges();

        } catch (error) {
            vscode.window.showErrorMessage(`Git 提交检测失败: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

// 获取 Git 暂存区的文件
function getGitStagedFiles(): string[] {
    try {
        const output = cp.execSync('git diff --cached --name-only', { encoding: 'utf8' });
        return output.split('\n').filter(file => file.trim() !== '');
    } catch (error) {
        vscode.window.showErrorMessage(`❌ 获取 Git 暂存文件失败: ${error.message}`);
        return [];
    }
}

// 执行 Git 提交
function commitChanges() {
    try {
        cp.execSync('git commit', { stdio: 'inherit' });
        vscode.window.showInformationMessage("✅ Git 提交成功！");
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Git 提交失败: ${error.message}`);
    }
}

// 插件关闭时清理
export function deactivate() {}
