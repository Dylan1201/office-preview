@echo off
chcp 65001 >nul
setlocal

REM ============================================
REM  @vue-office-plus/preview 一键发布到 npm 官方源
REM  使用前请先在独立终端执行：
REM    npm login --registry=https://registry.npmjs.org/ --scope=@vue-office-plus
REM ============================================

set REGISTRY=https://registry.npmjs.org/
set PKG_DIR=%~dp0..\packages\vue-preview
set PKG_NAME=@vue-office-plus/preview

echo ============================================
echo   发布 %PKG_NAME% 到 npm 官方源
echo ============================================
echo.

REM [1/3] 检查登录
echo [1/3] 检查 npm 登录状态...
set NPM_USER=
for /f "delims=" %%i in ('call npm whoami --registry=%REGISTRY% 2^>nul') do set NPM_USER=%%i
if "%NPM_USER%"=="" (
    echo.
    echo   [X] 未登录或登录已过期
    echo.
    echo   请先在独立 PowerShell/CMD 窗口执行：
    echo     npm login --registry=%REGISTRY% --scope=@vue-office-plus
    echo.
    echo   npm 9+ 会输出一个浏览器登录 URL，在浏览器完成确认即可。
    echo.
    pause
    exit /b 1
)
echo   [v] 已登录：%NPM_USER%
echo.

REM [2/3] 构建
echo [2/3] 构建聚合包...
cd /d "%PKG_DIR%"
call npm run build
if errorlevel 1 (
    echo.
    echo   [X] 构建失败
    pause
    exit /b 1
)
echo   [v] 构建完成
echo.

REM [3/3] 发布
echo [3/3] 发布 %PKG_NAME%...
call npm publish --registry=%REGISTRY% --access public
if errorlevel 1 (
    echo.
    echo   [X] 发布失败
    echo   常见原因：版本号已存在 / 未开通 2FA / 网络问题
    pause
    exit /b 1
)

echo.
echo ============================================
echo   [v] 发布成功！
echo   https://www.npmjs.com/package/%PKG_NAME%
echo ============================================
echo.
pause
