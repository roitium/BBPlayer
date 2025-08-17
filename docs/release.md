# 发版流程（Release Guide）

本文描述 BBPlayer 的发版步骤与约定，确保客户端能正确检测更新并展示说明。

## 1. 准备版本

- 更新 `package.json`：同步修改 `version` 与 `versionCode`（Android）。
- 完成变更说明：整理本次发布的要点（修复、优化、新特性）。

## 2. 更新更新清单（update.json）

- 文件位置：仓库根目录 `./update.json`。
- 字段约定：
  - `version`：语义化版本号（如 `1.2.3`）。
  - `url`：下载链接（APK 或 Release 页面）。
  - `notes`：更新说明（支持多行）。
  - `forced`：是否为强制更新（true 时仅显示“去更新”）。
- 示例：
  {
  "version": "1.2.3",
  "url": "https://example.com/bbplayer-1.2.3.apk",
  "notes": "• 修复崩溃\n• 优化启动速度",
  "forced": false
  }

## 3. 推送与发布

- 将修改提交并合并到默认分支（`main`）。
- 通过 jsDelivr 暴露清单（无需额外配置）：
  https://cdn.jsdelivr.net/gh/yanyao2333/bbplayer@main/update.json
- 确保 `app.config.ts` 的 `extra.updateManifestUrl` 指向上述地址。

## 4. 构建与分发

- 使用 EAS 或本地构建生成安装包并上传到 `url` 指定的位置。
- 如需强制更新，将 `forced` 设为 `true` 并确保 `url` 可访问。

## 5. 客户端行为说明

- App 启动时读取 `update.json`：
  - 若有新版本：
    - `forced: true` 显示强制更新 Modal，仅“去更新”。
    - 否则：“去更新 / 跳过此版本 / 取消”。跳过后会记住该版本，不再提示（除非强制）。
- 版本比较基于语义化规则（主、次、补丁）。
