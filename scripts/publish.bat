@echo off
echo ======================================
echo   发布到 Verdaccio 私有仓库
echo   仓库地址: http://localhost:4873
echo ======================================
echo.

REM 设置npm仓库为verdaccio
npm config set registry http://localhost:4873

REM 设置verdaccio作用域的认证
npm config set -- //localhost:4873/:_authToken ""

echo 正在登录verdaccio...
npm adduser --registry http://localhost:4873

echo.
echo 开始构建和发布...
echo.

REM 使用lerna发布
npx lerna publish --yes --registry http://localhost:4873

echo.
echo ======================================
echo   发布完成！
echo ======================================
pause
