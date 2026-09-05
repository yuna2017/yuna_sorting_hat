$ours = git show main:src/data/questions.ts
$theirs = git show origin/main:src/data/questions.ts

function Parse-Copy($content) {
  $map = @{}
  $key = $null
  foreach ($line in ($content -split "`n")) {
    if ($line -match "^\s*id: '([^']+)'") { $key = $matches[1] }
    if ($key -and $line -match "^\s*(title|scene|text|whisper|detail): '(.*)'\s*$") {
      $map["$key|$($matches[1])"] = $matches[2]
    }
  }
  return $map
}

$om = Parse-Copy $ours
$tm = Parse-Copy $theirs
$changed = @()
foreach ($k in $om.Keys) {
  if ($tm.ContainsKey($k) -and $om[$k] -ne $tm[$k]) {
    $changed += [pscustomobject]@{ Key = $k; Ours = $om[$k]; Theirs = $tm[$k] }
  }
}
Write-Output ("=== 远程改动的文案条目数: {0} / 340 ===" -f $changed.Count)
Write-Output "--- 分字段 ---"
$changed | Group-Object { ($_.Key -split '\|')[1] } | ForEach-Object { "{0}: {1} 条" -f $_.Name, $_.Count }
Write-Output "--- 按题分组 ---"
$changed | Group-Object { ($_.Key -split '\|')[0] } | ForEach-Object { "{0}: {1} 条" -f $_.Name, $_.Count }

Write-Output "--- 示例(前 40 条, 我们的 → 远程) ---"
$changed | Select-Object -First 40 | ForEach-Object {
  $id = ($_.Key -split '\|')[0]; $f = ($_.Key -split '\|')[1]
  "【$id $f】`n  我们: $($_.Ours)`n  远程: $($_.Theirs)"
}