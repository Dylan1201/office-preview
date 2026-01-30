#!/bin/bash

# 设置npm仓库为verdaccio
npm set registry http://localhost:4873

echo "======================================"
echo "  发布到 Verdaccio 私有仓库"
echo "  仓库地址: http://localhost:4873"
echo "======================================"
echo ""

# 登录verdaccio（如果需要）
echo "正在登录verdaccio..."
npm adduser --registry http://localhost:4873

echo ""
echo "开始构建和发布..."
echo ""

# 使用lerna发布
npx lerna publish --yes --registry http://localhost:4873

echo ""
echo "======================================"
echo "  发布完成！"
echo "======================================"
