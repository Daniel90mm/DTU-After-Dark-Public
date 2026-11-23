$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $repoRoot 'dist'
$tempRoot = if ($env:TEMP) { $env:TEMP } elseif ($env:TMP) { $env:TMP } else { [System.IO.Path]::GetTempPath() }
$tmp = Join-Path $tempRoot 'dtu-firefox-build'
$outZip = Join-Path $dist 'dtu-dark-mode-firefox.zip'
$outUnpacked = Join-Path $dist 'firefox-unpacked'

function New-ZipWithForwardSlashes([string]$SourceDir, [string]$DestZip) {
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    if (Test-Path $DestZip) { Remove-Item -Force $DestZip }

    $base = (Resolve-Path $SourceDir).Path
    if (-not $base.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $base = $base + [System.IO.Path]::DirectorySeparatorChar
    }

    $zip = [System.IO.Compression.ZipFile]::Open($DestZip, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $files = Get-ChildItem -Path $SourceDir -Recurse -File
        foreach ($f in $files) {
            $full = $f.FullName
            $rel = if ($full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) { $full.Substring($base.Length) } else { $f.Name }
            $entryName = ($rel -replace '\\', '/').TrimStart('/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally {
        $zip.Dispose()
    }
}

function Add-LocalOverrideHostPermissions([string]$ManifestPath, [string]$ConfigText) {
    $manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    $permissions = @($manifest.permissions)
    $didChange = $false
    $matches = [regex]::Matches($ConfigText, 'https://[^"''\s]+')
    foreach ($match in $matches) {
        try {
            $uri = [Uri]$match.Value
            $permission = '{0}://{1}/*' -f $uri.Scheme, $uri.Host
            if (-not ($permissions -contains $permission)) {
                $permissions = @($permissions + $permission)
                $didChange = $true
            }
        } catch {
        }
    }
    if ($didChange) {
        $manifest.permissions = $permissions
        $manifest | ConvertTo-Json -Depth 100 | Set-Content -Path $ManifestPath
    }
}

function Get-ConfigStringValue([string]$ConfigText, [string]$Key) {
    $pattern = '(?m)\b' + [regex]::Escape($Key) + '\s*:\s*["'']([^"'']+)["'']'
    $match = [regex]::Match($ConfigText, $pattern)
    if ($match.Success) { return $match.Groups[1].Value.Trim() }
    return ''
}

function Write-ReleaseConfigStatus([string]$DestConfig) {
    $configText = Get-Content $DestConfig -Raw
    $libraryUrl = Get-ConfigStringValue -ConfigText $configText -Key 'LIVE_LIBRARY_TRENDS_URL'

    if ($libraryUrl) {
        try {
            $hostName = ([Uri]$libraryUrl).Host
            Write-Host "Library occupancy endpoint included for Firefox build: $hostName"
        } catch {
            Write-Host "Library occupancy endpoint included for Firefox build."
        }
        return
    }

    $message = 'LIVE_LIBRARY_TRENDS_URL is empty; Library occupancy graph/counts will be unavailable in this Firefox build.'
    if ($env:DTU_AFTER_DARK_REQUIRE_LIBRARY_TRENDS -eq '1') {
        throw $message
    }
    Write-Warning $message
}

function Copy-BuildConfig([string]$RepoRoot, [string]$DestConfig, [string]$ManifestPath) {
    $baseConfig = Join-Path $RepoRoot 'config.js'
    $localConfig = Join-Path $RepoRoot 'config.local.js'
    Copy-Item $baseConfig $DestConfig
    if (-not (Test-Path $localConfig)) {
        Write-ReleaseConfigStatus -DestConfig $DestConfig
        return
    }

    $localText = Get-Content $localConfig -Raw
    if ($localText -match '\b(const|let|var)\s+CONFIG\b') {
        Set-Content -Path $DestConfig -Value $localText -NoNewline
    } else {
        Add-Content -Path $DestConfig -Value "`r`n"
        Add-Content -Path $DestConfig -Value $localText
    }
    Add-LocalOverrideHostPermissions -ManifestPath $ManifestPath -ConfigText $localText
    Write-ReleaseConfigStatus -DestConfig $DestConfig
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
Remove-Item -Force $outZip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $outUnpacked -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

$files = @(
    'manifest.json',
    'background.cache.js',
    'background.shared.js',
    'background.grades.js',
    'background.findit.js',
    'background.deadlines.js',
    'background.exam.js',
    'background.evaluation.js',
    'background.mazemap.js',
    'background.library.js',
    'background.js',
    'config.js',
    'darkmode.dom.js',
    'darkmode.shadow-hook.page.js',
    'darkmode.url-pause.js',
    'darkmode.feature-flags.js',
    'darkmode.accent-theme.js',
    'darkmode.participant-intel-bridge.js',
    'darkmode.storage.js',
    'darkmode.theme-state.js',
    'darkmode.js',
    'darkmode.dark-engine.page-cases.js',
    'darkmode.dark-engine.styles.js',
    'darkmode.dark-engine.js',
    'darkmode.learn-accent-shell.js',
    'darkmode.smart-room-linker.js',
    'darkmode.textbooks.core.js',
    'darkmode.textbooks.kurser.js',
    'darkmode.textbooks.js',
    'darkmode.learn-nav.js',
    'darkmode.learn-shell.js',
    'darkmode.settings.bridge.js',
    'darkmode.settings.pause.js',
    'darkmode.settings.footer.js',
    'darkmode.settings.js',
    'darkmode.bus.presets.js',
    'darkmode.bus.setup.addline.js',
    'darkmode.bus.setup.js',
    'darkmode.bus.api.js',
    'darkmode.bus.js',
    'darkmode.library-data.js',
    'darkmode.library-trend.js',
    'darkmode.campusnet-gpa.js',
    'darkmode.content-shortcut.js',
    'darkmode.ics.js',
    'darkmode.deadlines.data.js',
    'darkmode.deadlines.timeline.js',
    'darkmode.deadlines.js',
    'darkmode.host-shells.js',
    'darkmode.kurser-course-eval.js',
    'darkmode.kurser-widgets.js',
    'darkmode.library.js',
    'darkmode.lessons-bulk.zip.js',
    'darkmode.lessons-bulk.tree.js',
    'darkmode.lessons-bulk.fetch.js',
    'darkmode.lessons-bulk.pdf-ink.js',
    'darkmode.lessons-bulk.activity.js',
    'darkmode.lessons-bulk.video.js',
    'darkmode.lessons-bulk.js',
    'darkmode.participant-intel-backfill.js',
    'darkmode.participant-intel-core.js',
    'darkmode.participant-intel-host.js',
    'darkmode.participant-intel-ui.js',
    'darkmode.skeleton.js',
    'darkmode.studyplanner-shell.js',
    'darkmode.studyplan-exam-schedule-core.js',
    'darkmode.studyplan-exam-schedule.styles.js',
    'darkmode.studyplan-exam-schedule.editor.js',
    'darkmode.studyplan-exam-schedule.js',
    'darkmode.kurser-course-map.js',
    'darkmode.kurser-exam-date.js',
    'darkmode.kurser-exam-stats.js',
    'exchange-permission.html',
    'exchange-permission.js',
    'course-map-data.json',
    'exam-stats-data.json',
    'literature-data.json',
    'darkmode.css'
)

foreach ($f in $files) {
    if ($f -eq 'config.js') {
        Copy-BuildConfig -RepoRoot $repoRoot -DestConfig (Join-Path $tmp $f) -ManifestPath (Join-Path $tmp 'manifest.json')
        continue
    }
    Copy-Item (Join-Path $repoRoot $f) (Join-Path $tmp $f)
}

Copy-Item -Recurse -Force (Join-Path $repoRoot 'images') (Join-Path $tmp 'images')

New-Item -ItemType Directory -Path $outUnpacked -Force | Out-Null
Copy-Item -Recurse -Force (Join-Path $tmp '*') $outUnpacked

New-ZipWithForwardSlashes -SourceDir $tmp -DestZip $outZip
Remove-Item -Recurse -Force $tmp
Write-Host "Firefox zip built successfully: $outZip"
Write-Host "Firefox unpacked build written to: $outUnpacked"
