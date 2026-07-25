# render_battle.ps1 — วาดแผนที่ยุทธวิธีเป็น PNG เพื่อตรวจการจัดวางด้วยตา
#   .\tools\render_battle.ps1 -Battle jieting228 -Phase 4
# ใช้ตอนที่เปิดเบราว์เซอร์ดูไม่ได้ หรืออยากเก็บภาพไว้เทียบ
param(
  [string]$Battle = 'jieting228',
  [int]$Phase = 4,
  [string]$Out  = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$src  = Get-Content "$root\data\battles\$Battle.js" -Raw -Encoding UTF8
if (-not $Out) { $Out = "$root\docs\battle_${Battle}_p$Phase.png" }

# ---- viewBox ----
$vb = [regex]::Match($src,'viewBox:\s*"0 0 (\d+) (\d+)"')
$VW = [int]$vb.Groups[1].Value; $VH = [int]$vb.Groups[2].Value
$K  = 1.25
$W  = [int]($VW*$K); $H = [int]($VH*$K)

$bmp = New-Object System.Drawing.Bitmap($W,$H)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias'; $g.TextRenderingHint='ClearTypeGridFit'
$g.Clear([System.Drawing.Color]::FromArgb(255,13,17,23))

function Pt($x,$y){ New-Object System.Drawing.PointF(([float]($x*$K)),([float]($y*$K))) }
function DrawPath($d,$pen){
  $cur=$null
  foreach($t in [regex]::Matches($d,'([MC])((?:\s*-?[\d.]+,-?[\d.]+)+)')){
    $nums=[regex]::Matches($t.Groups[2].Value,'(-?[\d.]+),(-?[\d.]+)')
    if($t.Groups[1].Value -eq 'M'){ $cur=Pt $nums[0].Groups[1].Value $nums[0].Groups[2].Value; continue }
    for($i=0;$i -lt $nums.Count;$i+=3){
      $p1=Pt $nums[$i].Groups[1].Value   $nums[$i].Groups[2].Value
      $p2=Pt $nums[$i+1].Groups[1].Value $nums[$i+1].Groups[2].Value
      $p3=Pt $nums[$i+2].Groups[1].Value $nums[$i+2].Groups[2].Value
      $g.DrawBezier($pen,$cur,$p1,$p2,$p3); $cur=$p3
    }
  }
}

$styles=@{
  ridge =@{c=[System.Drawing.Color]::FromArgb(158,61,107,74);  w=9}
  stream=@{c=[System.Drawing.Color]::FromArgb(217,63,127,174); w=7}
  road  =@{c=[System.Drawing.Color]::FromArgb(178,122,106,74); w=5}
  trench=@{c=[System.Drawing.Color]::FromArgb(230,138,106,58); w=7}
}
foreach($m in [regex]::Matches($src,'kind:"(ridge|stream|road|trench)",\s*d:"([^"]*(?:"\s*\+\s*"[^"]*)*)"')){
  $kind=$m.Groups[1].Value
  $d=$m.Groups[2].Value -replace '"\s*\+\s*"',''
  $s=$styles[$kind]
  $pen=New-Object System.Drawing.Pen($s.c,([float]($s.w*$K)))
  $pen.StartCap='Round'; $pen.EndCap='Round'
  if($kind -eq 'road'){ $pen.DashStyle='Dash' }
  DrawPath $d $pen; $pen.Dispose()
}

$fac=@{ han=[System.Drawing.ColorTranslator]::FromHtml('#2E9E5B')
        wei=[System.Drawing.ColorTranslator]::FromHtml('#2563A8')
        wu =[System.Drawing.ColorTranslator]::FromHtml('#C2413A') }
$fnL=New-Object System.Drawing.Font("Leelawadee UI",([float](13*$K)),[System.Drawing.FontStyle]::Bold)
$sf =New-Object System.Drawing.StringFormat; $sf.Alignment='Center'

foreach($m in [regex]::Matches($src,'kind:"fort",\s*at:\[(\d+),(\d+)\],\s*side:"(\w+)"(?:,\s*label:"([^"]+)")?')){
  $x=[int]$m.Groups[1].Value; $y=[int]$m.Groups[2].Value; $c=$fac[$m.Groups[3].Value]
  $pen=New-Object System.Drawing.Pen($c,([float](3*$K)))
  $g.DrawRectangle($pen,([float](($x-16)*$K)),([float](($y-16)*$K)),([float](32*$K)),([float](32*$K)))
  $p2=New-Object System.Drawing.Pen(([System.Drawing.Color]::FromArgb(140,$c.R,$c.G,$c.B)),([float](1.4*$K)))
  $g.DrawLine($p2,(Pt ($x-16) ($y-16)),(Pt ($x+16) ($y+16)))
  $g.DrawLine($p2,(Pt ($x+16) ($y-16)),(Pt ($x-16) ($y+16)))
  if($m.Groups[4].Success){
    $br=New-Object System.Drawing.SolidBrush($c)
    $g.DrawString($m.Groups[4].Value,$fnL,$br,([float]($x*$K)),([float](($y-44)*$K)),$sf); $br.Dispose()
  }
  $pen.Dispose(); $p2.Dispose()
}

# ---- หน่วยรบ: อ่านจาก units + reserves แล้วเดิน act ถึง phase ที่ขอ ----
$units=@{}
foreach($m in [regex]::Matches($src,'\{\s*id:"(\w+)",\s*side:"(\w+)",\s*shape:"(\w+)",\s*at:\[(\d+),(\d+)\],\s*strength:(\d+),\s*who:"(\w+)"')){
  $units[$m.Groups[1].Value]=@{ id=$m.Groups[1].Value; side=$m.Groups[2].Value
    shape=$m.Groups[3].Value; x=[double]$m.Groups[4].Value; y=[double]$m.Groups[5].Value
    str=[int]$m.Groups[6].Value; str0=[int]$m.Groups[6].Value; who=$m.Groups[7].Value; shown=$true }
}
# reserves ยังไม่โผล่
$resBlock=[regex]::Match($src,'(?s)reserves:\s*\[(.*?)\]')
if($resBlock.Success){
  foreach($m in [regex]::Matches($resBlock.Groups[1].Value,'id:"(\w+)"')){ $units[$m.Groups[1].Value].shown=$false }
}
# เดิน act ทีละ phase
# ปิดท้ายที่ "]" ซึ่งอยู่ที่ระดับย่อหน้า 6 ช่องเท่านั้น ไม่งั้นจะไปหยุดที่ ] ของพิกัด [x,y]
$phases=[regex]::Matches($src,'(?s)acts:\s*\[(.*?)\r?\n {6}\]')
for($p=0; $p -lt [Math]::Min($Phase,$phases.Count); $p++){
  $acts=$phases[$p].Groups[1].Value
  foreach($a in [regex]::Matches($acts,'u:"(\w+)",\s*spawn:\[(\d+),(\d+)\]')){
    $u=$units[$a.Groups[1].Value]; $u.shown=$true; $u.x=[double]$a.Groups[2].Value; $u.y=[double]$a.Groups[3].Value }
  foreach($a in [regex]::Matches($acts,'u:"(\w+)",\s*move:"([^"]*(?:"\s*\+\s*"[^"]*)*)"')){
    $d=$a.Groups[2].Value -replace '"\s*\+\s*"',''
    $nums=[regex]::Matches($d,'(-?[\d.]+),(-?[\d.]+)')
    $last=$nums[$nums.Count-1]
    $u=$units[$a.Groups[1].Value]; $u.x=[double]$last.Groups[1].Value; $u.y=[double]$last.Groups[2].Value }
  foreach($a in [regex]::Matches($acts,'u:"(\w+)",\s*shrink:([\d.]+)')){
    $u=$units[$a.Groups[1].Value]; $u.str=[int]($u.str0*[double]$a.Groups[2].Value) }
}

$names=@{}
$nm=Get-Content "$root\data\names.js" -Raw -Encoding UTF8
foreach($m in [regex]::Matches($nm,'(\w+):\s*\{\s*th:\s*"([^"]+)"')){ $names[$m.Groups[1].Value]=$m.Groups[2].Value }

$dark=New-Object System.Drawing.Pen(([System.Drawing.Color]::FromArgb(255,8,10,14)),([float](2*$K)))
$fnN=New-Object System.Drawing.Font("Leelawadee UI",([float](14*$K)),[System.Drawing.FontStyle]::Bold)
$fnS=New-Object System.Drawing.Font("Leelawadee UI",([float](11.5*$K)))
$brW=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$brD=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,170,178,198))
# ไม่ใช้ตัวอักษรไทยใน .ps1 — PowerShell 5.1 อ่านไฟล์ที่ไม่มี BOM เป็น ANSI แล้วภาษาไทยจะเพี้ยน
# (ชื่อคนไม่เพี้ยนเพราะอ่านมาจาก names.js ด้วย -Encoding UTF8)
function Fmt($n){ "{0:N0}" -f $n }

foreach($u in $units.Values){
  if(-not $u.shown){ continue }
  $s=9+[Math]::Sqrt($u.str)/11
  $col=$fac[$u.side]; $br=New-Object System.Drawing.SolidBrush($col)
  if($u.shape -eq 'square'){
    $g.FillRectangle($br,([float](($u.x-$s)*$K)),([float](($u.y-$s)*$K)),([float](2*$s*$K)),([float](2*$s*$K)))
    $g.DrawRectangle($dark,([float](($u.x-$s)*$K)),([float](($u.y-$s)*$K)),([float](2*$s*$K)),([float](2*$s*$K)))
  } else {
    $tp=@((Pt $u.x ($u.y-$s)),(Pt ($u.x+$s*0.92) ($u.y+$s*0.72)),(Pt ($u.x-$s*0.92) ($u.y+$s*0.72)))
    $g.FillPolygon($br,[System.Drawing.PointF[]]$tp); $g.DrawPolygon($dark,[System.Drawing.PointF[]]$tp)
  }
  $lbl=if($names[$u.who]){$names[$u.who]}else{$u.id}
  $g.DrawString($lbl,$fnN,$brW,([float]($u.x*$K)),([float](($u.y-$s-26)*$K)),$sf)
  $g.DrawString((Fmt $u.str),$fnS,$brD,([float]($u.x*$K)),([float](($u.y+$s+6)*$K)),$sf)
  $br.Dispose()
}
$g.Dispose()
$bmp.Save($Out,[System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
"saved -> $Out"
