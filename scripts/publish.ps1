# Vue3 Office Preview - 发布到Verdaccio脚本

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Vue3 Office Preview - 发布脚本" -ForegroundColor Cyan
Write-Host "  目标: http://localhost:4873" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 设置npm仓库
Write-Host "[1/4] 设置npm仓库..." -ForegroundColor Yellow
npm config set registry http://localhost:4873 2>$null

# 检查是否已登录
$npmrcPath = "$env:USERPROFILE\.npmrc"
$hasAuth = Select-String -Path $npmrcPath -Pattern "//localhost:4873" -Quiet

if (-not $hasAuth) {
    Write-Host ""
    Write-Host "[2/4] 需要登录verdaccio..." -ForegroundColor Yellow
    Write-Host "请按提示输入用户名和密码" -ForegroundColor White
    Write-Host "默认用户名: admin" -ForegroundColor Gray
    Write-Host "默认密码: (您设置的密码)" -ForegroundColor Gray
    Write-Host ""
    npm adduser --registry http://localhost:4873

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "登录失败！" -ForegroundColor Red
        Write-Host "请检查verdaccio是否正常运行" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "[2/4] 已登录，跳过" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/4] 开始发布包..." -ForegroundColor Yellow
Write-Host ""

$packages = @(
    @{ Path = "core"; Name = "@vue3-office/core" },
    @{ Path = "packages\vue-docx"; Name = "@vue3-office/docx" },
    @{ Path = "packages\vue-excel"; Name = "@vue3-office/excel" },
    @{ Path = "packages\vue-pptx"; Name = "@vue3-office/pptx" }
)

$baseDir = "D:\code\demo\vue3-office-preview"

for ($i = 0; $i -lt $packages.Count; $i++) {
    $pkg = $packages[$i]
    Write-Host "  [$($i+1)/$($packages.Count)] 发布 $($pkg.Name)..." -ForegroundColor Cyan

    $pkgPath = Join-Path $baseDir $pkg.Path
    Push-Location $pkgPath

    npm publish --registry http://localhost:4873 2>&1 | ForEach-Object {
        if ($_ -match "npm notice") {
            Write-Host "    $_" -ForegroundColor Gray
        } elseif ($_ -match "npm error") {
            Write-Host "    $_" -ForegroundColor Red
        } else {
            Write-Host "    $_" -ForegroundColor White
        }
    }

    Pop-Location

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $($pkg.Name) 发布成功" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $($pkg.Name) 发布失败" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "[4/4] 发布完成！" -ForegroundColor Green
Write-Host ""
Write-Host "访问 http://localhost:4873 查看已发布的包" -ForegroundColor Cyan
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
pause
