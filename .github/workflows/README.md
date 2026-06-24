# GitHub Pages 部署说明

## 工作原理

push 到 `master` 分支后，`.github/workflows/deploy.yml` 自动：

1. 用 pnpm 安装依赖
2. 构建 `examples/vue3-demo`（设置 `VITE_BASE_PATH=/office-preview/`）
3. 把 `examples/vue3-demo/dist` 部署到 GitHub Pages

## 配置步骤

### 1. 在 GitHub 新建仓库

仓库名建议 `office-preview`（与 Gitee 同名）。

### 2. 把代码推到 GitHub

```bash
# 添加 GitHub 远程
git remote add github https://github.com/<你的用户名>/office-preview.git

# 推送
git push github master
```

### 3. 开启 GitHub Pages

进入 GitHub 仓库 → **Settings** → **Pages**：
- **Source**：选 **GitHub Actions**（不是 Branch）
- workflow 会自动接管部署

### 4. 访问预览地址

部署完成后访问：

```
https://<你的用户名>.github.io/office-preview/
```

## 修改仓库名？

如果 GitHub 仓库名不是 `office-preview`，需改两处：

1. `.github/workflows/deploy.yml` 中的 `VITE_BASE_PATH`
2. 推送命令中的远程地址

## 手动触发

GitHub 仓库 → **Actions** → `Deploy Demo to GitHub Pages` → **Run workflow**
