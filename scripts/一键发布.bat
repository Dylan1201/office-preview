# 一键发布脚本 - 需要先登录

@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ======================================
echo   Vue3 Office Preview - 发布脚本
echo   目标: http://localhost:4873
echo ======================================
echo.

REM 设置npm仓库
echo [1/4] 设置npm仓库...
call npm config set registry http://localhost:4873 2>nul

REM 检查是否已登录
findstr /C:"localhost:4873" %USERPROFILE%\.npmrc | findstr /C:"_auth" >nul
if errorlevel 1 (
    echo.
    echo [2/4] 需要登录verdaccio...
    echo.
    echo 请按提示输入用户名和密码：
    echo   - 默认用户名: admin
    echo   - 密码: (您设置的密码)
    echo   - 邮箱: (任意邮箱)
    echo.
    call npm adduser --registry http://localhost:4873
    if errorlevel 1 (
        echo.
        echo 登录失败！请检查verdaccio是否正常运行
        pause
        exit /b 1
    )
) else (
    echo [2/4] 已登录，跳过
)

echo.
echo [3/4] 开始发布包...
echo.

set BASE_DIR=D:\code\demo\vue3-office-preview
set COUNT=0

REM 发布core包
set /a COUNT+=1
echo  [!COUNT!/4] 发布 @vue3-office/core...
cd /d "%BASE_DIR%\core"
call npm publish --registry http://localhost:4873 2>nul
if errorlevel 1 (
    echo   ✗ 发布失败
) else (
    echo   ✓ 发布成功
)

REM 发布docx包
set /a COUNT+=1
echo  [!COUNT!/4] 发布 @vue3-office/docx...
cd /d "%BASE_DIR%\packages\vue-docx"
call npm publish --registry http://localhost:4873 2>nul
if errorlevel 1 (
    echo   ✗ 发布失败
) else (
    echo   ✓ 发布成功
)

REM 发布excel包
set /a COUNT+=1
echo  [!COUNT!/4] 发布 @vue3-office/excel...
cd /d "%BASE_DIR%\packages\vue-excel"
call npm publish --registry http://localhost:4873 2>nul
if errorlevel 1 (
    echo   ✗ 发布失败
) else (
    echo   ✓ 发布成功
)

REM 发布pptx包
set /a COUNT+=1
echo  [!COUNT!/4] 发布 @vue3-office/pptx...
cd /d "%BASE_DIR%\packages\vue-pptx"
call npm publish --registry http://localhost:4873 2>nul
if errorlevel 1 (
    echo   ✗ 发布失败
) else (
    echo   ✓ 发布成功
)

echo.
echo [4/4] 发布完成！
echo.
echo 访问 http://localhost:4873 查看已发布的包
echo.
echo ======================================
pause
