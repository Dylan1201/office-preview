@echo off
echo ======================================
echo   发布到 Verdaccio 私有仓库
echo   仓库地址: http://localhost:4873
echo ======================================
echo.

REM 设置npm仓库为verdaccio
npm config set registry http://localhost:4873

echo.
echo 正在登录verdaccio...
echo 请按提示输入用户名和密码
echo.
npm adduser --registry http://localhost:4873

if errorlevel 1 (
    echo.
    echo 登录失败，请重试
    pause
    exit /b 1
)

echo.
echo ======================================
echo 开始发布所有包...
echo ======================================
echo.

REM 发布core包
echo [1/4] 发布 @vue3-office/core
cd core
npm publish --registry http://localhost:4873
cd ..

REM 发布docx包
echo [2/4] 发布 @vue3-office/docx
cd packages\vue-docx
npm publish --registry http://localhost:4873
cd ..\..

REM 发布excel包
echo [3/4] 发布 @vue3-office/excel
cd packages\vue-excel
npm publish --registry http://localhost:4873
cd ..\..

REM 发布pptx包
echo [4/4] 发布 @vue3-office/pptx
cd packages\vue-pptx
npm publish --registry http://localhost:4873
cd ..\..

echo.
echo ======================================
echo 发布完成！
echo ======================================
echo.
echo 您可以访问 http://localhost:4873 查看已发布的包
echo.
pause
