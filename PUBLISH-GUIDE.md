# Vue3 Office Preview - 发布到Verdaccio指南

## 问题分析

当前verdaccio需要认证才能发布包。

## 解决方案

### 方法一：手动登录后发布（推荐）

1. **打开命令行，执行：**
   ```bash
   cd D:\code\demo\vue3-office-preview
   npm config set registry http://localhost:4873
   ```

2. **登录verdaccio：**
   ```bash
   npm adduser --registry http://localhost:4873
   ```
   按提示输入：
   - Username: `admin` （或您设置的用户名）
   - Password: 您的密码
   - Email: `admin@example.com`

3. **发布所有包：**
   ```bash
   # 方法A：运行一键发布脚本
   scripts\publish-all.bat

   # 方法B：手动依次发布
   cd core && npm publish && cd ..
   cd packages/vue-docx && npm publish && cd ../..
   cd packages/vue-excel && npm publish && cd ../..
   cd packages/vue-pptx && npm publish && cd ../..
   ```

### 方法二：配置Verdaccio允许匿名发布

修改您的verdaccio配置文件（config/config.yaml），添加：

```yaml
# 允许匿名发布
publish:
  allow_actions: ['publish']

# 或者
packages:
  '@vue3-office/*':
    access: $all
    publish: $all
```

然后重启verdaccio容器：
```bash
docker restart verdaccio容器名
```

### 方法三：使用Token认证

1. 登录获取token：
   ```bash
   npm adduser --registry http://localhost:4873 --//localhost:4873/:_auth=${NPM_TOKEN}
   ```

2. 将token添加到.npmrc：
   ```bash
   //localhost:4873/:_authToken=您的token
   ```

## 验证发布成功

访问 http://localhost:4873/-/web ，应该能看到以下包：
- @vue3-office/core@1.0.0
- @vue3-office/docx@1.0.0
- @vue3-office/excel@1.0.0
- @vue3-office/pptx@1.0.0

## 使用已发布的包

在其他项目中：
```bash
npm config set registry http://localhost:4873
npm install @vue3-office/docx
npm install @vue3-office/excel
npm install @vue3-office/pptx
```
