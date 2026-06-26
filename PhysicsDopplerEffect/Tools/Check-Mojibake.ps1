param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$textExtensions = @(
    '.aspx',
    '.master',
    '.ascx',
    '.cs',
    '.js',
    '.css',
    '.json',
    '.xml',
    '.config',
    '.resx',
    '.md'
)

$excludedPathPattern = '\\(bin|obj|packages|\.vs)\\'
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)

$markerCodes = @(
    0x00C3, # Latin capital A with tilde: common first character in UTF-8 mojibake.
    0x00D8, # Latin capital O with stroke: Arabic UTF-8 decoded as Latin-1/Windows-1252.
    0x00D9, # Latin capital U with grave: Arabic UTF-8 decoded as Latin-1/Windows-1252.
    0x00C2, # Latin capital A with circumflex: symbols such as middle dot decoded incorrectly.
    0x00E2, # Latin small A with circumflex: punctuation/symbol UTF-8 decoded incorrectly.
    0xFFFD  # Unicode replacement character.
)

$markers = $markerCodes | ForEach-Object { [char]$_ }
$issues = New-Object System.Collections.Generic.List[string]

Get-ChildItem -LiteralPath $Root -Recurse -File |
    Where-Object {
        $textExtensions -contains $_.Extension.ToLowerInvariant() -and
        $_.FullName -notmatch $excludedPathPattern
    } |
    ForEach-Object {
        $file = $_
        $relative = Resolve-Path -LiteralPath $file.FullName -Relative

        try {
            $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
            $text = $utf8Strict.GetString($bytes)
        } catch {
            $issues.Add(('{0}: invalid UTF-8: {1}' -f $relative, $_.Exception.Message))
            return
        }

        $lines = $text -split "`r`n|`n|`r"
        for ($lineIndex = 0; $lineIndex -lt $lines.Length; $lineIndex += 1) {
            foreach ($marker in $markers) {
                $column = $lines[$lineIndex].IndexOf($marker)
                if ($column -ge 0) {
                    $issues.Add(('{0}:{1}:{2}: suspicious mojibake marker U+{3:X4}' -f $relative, ($lineIndex + 1), ($column + 1), [int]$marker))
                }
            }
        }
    }

if ($issues.Count -gt 0) {
    $issues | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "No mojibake markers or invalid UTF-8 text files found."
