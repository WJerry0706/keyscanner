import * as vscode from 'vscode';

export function detectPasswords(text: string): vscode.Range[] {
    const passwordPatterns = [
        // 常见密码和密钥名称
        /\b(password|passwd|pwd|pass|credential|secret|key|token|auth|access[_-]key|private[_-]key|client[_-]secret|api[_-]key|bearer[_-]token|jwt)\s*[:=]\s*['"][^'"]+['"]/gi,
    
        // 赋值格式: key = value (无引号)
        /\b(password|passwd|pwd|pass|credential|secret|key|token|auth|access[_-]key|private[_-]key|client[_-]secret|api[_-]key|bearer[_-]token|jwt)\s*[:=]\s*[^\s]+/gi,
    
        // JSON/YAML 格式: "key": "value" 或 'key': 'value'
        /["'](password|passwd|pwd|pass|credential|secret|key|token|auth|access[_-]key|private[_-]key|client[_-]secret|api[_-]key|bearer[_-]token|jwt)["']\s*:\s*["'][^"']+["']/gi,
        /\b(password|passwd|pwd|pass|credential|secret|key|token|auth|access[_-]key|private[_-]key|client[_-]secret|api[_-]key|bearer[_-]token|jwt)\s*:\s*[^\s]+/gi,
    
        /https?:\/\/[^\s?]+\?(?:[^\s&]*_?(password|passwd|pwd|pass|credential|secret|key|token|auth|access[_-]key|private[_-]key|client[_-]secret|api[_-]key|bearer[_-]token|jwt)=[^\s&]+)/gi,
        // Base64 编码的密钥 (16,24,64 位编码)
        /([A-Za-z0-9+/=]{16,24,64,})/gi,
    
        // 可能的十六进制格式 (32+ 位长的 hex 字符串)
        /\b[0-9a-fA-F]{32,}\b/gi,
    
        // UUID 格式
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    
        // 环境变量检测 (.env 文件格式, AWS, GitHub, GitLab, Google API Keys)
        /\b(AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|GITHUB_TOKEN|GITLAB_TOKEN|GOOGLE_API_KEY|TWILIO_AUTH_TOKEN|DROPBOX_ACCESS_TOKEN|HEROKU_API_KEY|SLACK_BOT_TOKEN|DIGITALOCEAN_ACCESS_TOKEN|AZURE_CLIENT_SECRET|CLOUDFLARE_API_KEY|BITBUCKET_APP_PASSWORD)\s*=\s*([A-Za-z0-9_\-\/+=]{16,})/gi
    ];
    
    const ranges: vscode.Range[] = [];
    const lines = text.split("\n"); // 按行分割文本

    lines.forEach((lineText, lineNumber) => {
        passwordPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(lineText)) !== null) {
                const startPos = match.index;
                const endPos = startPos + match[0].length;
                const start = new vscode.Position(lineNumber, startPos);
                const end = new vscode.Position(lineNumber, endPos);
                ranges.push(new vscode.Range(start, end));
            }
        });
    });

    return ranges;
}
