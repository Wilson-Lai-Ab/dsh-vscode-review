# dsh-vscode-review

![vsdp联名.jpg](https://20040424.xyz/PicList/vsdp联名.jpg)

一个仓库装齐 dsh 插件 + VS Code 插件。本工作区副本维护在 [Wilson-Lai-Ab/dsh-vscode-review](https://github.com/Wilson-Lai-Ab/dsh-vscode-review)，上游为 [Tlyer233/dsh-vscode-review](https://github.com/Tlyer233/dsh-vscode-review)。dsh 两包已纳入聚合包 `dsh-idea-style`。

![PixPin_2026-08-16_23-10-56.png](https://20040424.xyz/PicList/PixPin_2026-08-16_23-10-56.png)

| 文件夹 | 内容 | 说明 |
|---|---|---|
| `packages/` | `dsh-review` + `dsh-review-changes` | dsh 侧：journal / 工具 / Review Changes 面板 |
| `vscode_dsh_plugin/` | VS Code 扩展 + VSIX | VS Code 内联 diff + 右侧 dsh 面板 |

## 一键安装（同时安装 dsh 和 VS Code）

```bash
git clone --recurse-submodules https://github.com/Tlyer233/dsh-vscode-review.git
cd dsh-vscode-review
./install.sh
```

Windows PowerShell：

```powershell
git clone https://github.com/Tlyer233/dsh-vscode-review.git
cd dsh-vscode-review
.\install.ps1
```

脚本会依次：

1. `dsh plugin --profile web add ./packages/dsh-review`
2. `dsh plugin --profile web add ./packages/dsh-review-changes`
3. `code --install-extension ./vscode_dsh_plugin/dsh-review-vscode-0.1.0.vsix --force`
4. 把 `dsn.dsh-review-vscode` 写入 VS Code `argv.json` 的 `enable-proposed-api`（逐段 Accept/Reject 依赖 `editorInsets`）

完成后：
- 重启 dsh web；
- **完全退出 VS Code 再打开**（`Cmd+Q` / `Alt+F4`）。只跑 `Developer: Reload Window` **不够**，行级按钮不会出现。

## 手动安装

dsh 侧：

```bash
dsh plugin --profile web add ./packages/dsh-review
dsh plugin --profile web add ./packages/dsh-review-changes
```

VS Code 侧：

```bash
code --install-extension ./vscode_dsh_plugin/dsh-review-vscode-0.1.0.vsix --force
node ./vscode_dsh_plugin/lib/proposed-api.js
```

然后 **完全退出 VS Code 再打开**。

## 逐段 Accept / Reject 不出现？

行级「接受 1/n / 撤回 1/n」用的是 VS Code **未稳定** API `editorInsets`。正式安装的 VSIX 默认被禁，扩展会降级成：绿高亮 + 文件级「全部接受 / 全部撤回」，看起来像少了功能。

一键安装脚本会写入 `argv.json`。若你是手动装的，或装完只 Reload 了窗口：

1. 命令面板运行 `dsh review: Enable per-hunk Accept/Reject (proposed API)`，或手动在 `~/.vscode/argv.json`（Windows：`%APPDATA%\Code\argv.json`）加上：

```json
"enable-proposed-api": ["dsn.dsh-review-vscode"]
```

2. **完全退出再开** VS Code，不要只 Reload。
3. 让 dsh 再改一次文件。编辑器里应出现红绿块和逐段按钮。

开发宿主（`code --extensionDevelopmentPath=...`）会自动放行，无需这一步。

## 代理重启（VS Code 扩展）

扩展提供 `dsh: Restart dsh (proxy)`（侧边栏**黄色刷新按钮**）：带 `HTTPS_PROXY` 环境变量重启 dsh，
使 opencode.ai 等按出口 IP 判定区域的模型（如 gpt-5.6）走梯子代理。
代理端口在 VSCode 设置 `dshReview.proxyPort` 配置（默认 `7897`，`127.0.0.1`）。

## 升级 / 卸载

```bash
dsh plugin --profile web update @dsn/dsh-review review-changes
dsh plugin --profile web remove @dsn/dsh-review review-changes
```

## License

MIT
