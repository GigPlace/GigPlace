# ============================================================
#  PROJECT STRUCTURE REPORT
#  Pages, API Routes, Components, Contexts, Lib, Tree, Summary
# ============================================================

$root    = (Get-Location).Path
$exclude = 'node_modules|\.next|\.git|dist|build|coverage|\.turbo|\.vercel'

function Show-Header($text) {
    Write-Host ""
    Write-Host ("=" * 62) -ForegroundColor DarkGray
    Write-Host " $text" -ForegroundColor Cyan
    Write-Host ("=" * 62) -ForegroundColor DarkGray
}
function Show-Section($text) {
    Write-Host ""
    Write-Host "-- $text" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 1. PAGES
# ------------------------------------------------------------
Show-Header "PAGES"
$pages = Get-ChildItem -Path . -Recurse -File -Include "page.tsx","page.ts","page.jsx","page.js" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $exclude }
if ($pages) {
    $pages | Sort-Object FullName | ForEach-Object {
        $rel = $_.FullName.Replace($root + '\', '')
        $url = $rel -replace '\\page\.(tsx|ts|jsx|js)$','' -replace '^app',''
        $url = $url -replace '\\','/'
        if ([string]::IsNullOrEmpty($url)) { $url = "/" }
        Write-Host ("  {0,-60} ->  {1}" -f $rel, $url) -ForegroundColor Green
    }
}

# ------------------------------------------------------------
# 2. API ROUTES
# ------------------------------------------------------------
Show-Header "API ROUTES"
$apiRoutes = Get-ChildItem -Path .\app\api -Recurse -File -Include "route.tsx","route.ts","route.jsx","route.js" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $exclude }
if ($apiRoutes) {
    $apiRoutes | Sort-Object FullName | ForEach-Object {
        $rel = $_.FullName.Replace($root + '\', '')
        $endpoint = $rel -replace '\\route\.(tsx|ts|jsx|js)$','' -replace '^app',''
        $endpoint = $endpoint -replace '\\','/'
        Write-Host ("  {0,-60} ->  {1}" -f $rel, $endpoint) -ForegroundColor Cyan
    }
} else {
    Write-Host "  (no API routes found)" -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# 3. COMPONENTS
# ------------------------------------------------------------
Show-Header "COMPONENTS"
$components = Get-ChildItem -Path .\components -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $exclude -and $_.Extension -match '\.(tsx|ts|jsx|js)$' }
if ($components) {
    $grouped = $components | Group-Object { $_.DirectoryName.Replace($root + '\','') } | Sort-Object Name
    foreach ($g in $grouped) {
        Show-Section $g.Name
        $g.Group | Sort-Object Name | ForEach-Object {
            Write-Host ("    * " + $_.Name) -ForegroundColor Green
        }
    }
}

# ------------------------------------------------------------
# 4. CONTEXTS
# ------------------------------------------------------------
Show-Header "CONTEXTS"
$contexts = Get-ChildItem -Path .\app\contexts, .\contexts, .\src\contexts -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $exclude -and $_.Extension -match '\.(tsx|ts|jsx|js)$' }
if ($contexts) {
    $contexts | Sort-Object FullName | ForEach-Object {
        $rel = $_.FullName.Replace($root + '\', '')
        Write-Host ("    * " + $rel) -ForegroundColor Green
    }
} else {
    Write-Host "  (no contexts found)" -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# 5. LIBRARY / UTILITIES
# ------------------------------------------------------------
Show-Header "LIB / UTILITIES"
$libFiles = Get-ChildItem -Path .\lib -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $exclude -and $_.Extension -match '\.(tsx|ts|jsx|js)$' }
if ($libFiles) {
    $grouped = $libFiles | Group-Object { $_.DirectoryName.Replace($root + '\','') } | Sort-Object Name
    foreach ($g in $grouped) {
        Show-Section $g.Name
        $g.Group | Sort-Object Name | ForEach-Object {
            Write-Host ("    * " + $_.Name) -ForegroundColor Green
        }
    }
} else {
    Write-Host "  (no lib folder)" -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# 6. SUPABASE FUNCTIONS
# ------------------------------------------------------------
Show-Header "SUPABASE"
if (Test-Path .\supabase\functions) {
    Get-ChildItem -Path .\supabase\functions -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host ("    fn: " + $_.Name) -ForegroundColor Magenta
    }
}
if (Test-Path .\supabase\migrations) {
    Write-Host "  migrations:" -ForegroundColor Yellow
    Get-ChildItem -Path .\supabase\migrations -File -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
        Write-Host ("    * " + $_.Name) -ForegroundColor Green
    }
}

# ------------------------------------------------------------
# 7. FOLDER TREE (recursive, cleaned)
# ------------------------------------------------------------
Show-Header "FOLDER TREE"
function Show-Tree($path, $prefix = "") {
    $items = Get-ChildItem -Path $path -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch $exclude } | Sort-Object Name
    $count = $items.Count
    for ($i = 0; $i -lt $count; $i++) {
        $item   = $items[$i]
        $isLast = ($i -eq $count - 1)
        $branch = if ($isLast) { "+-- " } else { "|-- " }
        Write-Host ($prefix + $branch + $item.Name) -ForegroundColor Gray
        $newPrefix = $prefix + $(if ($isLast) { "    " } else { "|   " })
        Show-Tree $item.FullName $newPrefix
    }
}
Show-Tree $root

# ------------------------------------------------------------
# 8. SUMMARY
# ------------------------------------------------------------
Show-Header "SUMMARY"
$totalPages      = ($pages      | Measure-Object).Count
$totalApi        = ($apiRoutes | Measure-Object).Count
$totalComponents = ($components | Measure-Object).Count
$totalTsx        = (Get-ChildItem -Path . -Recurse -File -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $exclude } | Measure-Object).Count

Write-Host ("  Pages:        {0}" -f $totalPages)      -ForegroundColor Green
Write-Host ("  API routes:   {0}" -f $totalApi)        -ForegroundColor Cyan
Write-Host ("  Components:   {0}" -f $totalComponents) -ForegroundColor Green
Write-Host ("  TS/TSX files: {0}" -f $totalTsx)        -ForegroundColor Green
Write-Host "  Done." -ForegroundColor Cyan
