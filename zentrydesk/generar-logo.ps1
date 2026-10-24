# Logo de la pantalla principal (monitor mostaza con la Z + "ZentryDesk"), 420x120: la app lo muestra a 300x60 como máximo.
# logo_dark.png (texto blanco) para el tema oscuro; logo_light.png y logo.png (texto oscuro) para el claro.
# Uso (Windows PowerShell): powershell -File zentrydesk\generar-logo.ps1 zentrydesk\iconos
param([string]$out = (Join-Path $PSScriptRoot 'iconos'))
Add-Type -AssemblyName System.Drawing

function Draw-Logo([string]$file, [System.Drawing.Color]$text) {
  $bmp = New-Object System.Drawing.Bitmap 420, 120
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)
  # Ícono: mismo diseño de 64x64 que icon.svg, escalado 1.6 y desplazado 8,8.
  $s = 1.6; $ox = 8; $oy = 8
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = 18 * $s
  $x0 = $ox + 5 * $s; $y0 = $oy + 6 * $s; $x1 = $ox + 59 * $s; $y1 = $oy + 47 * $s
  $p.AddArc($x0, $y0, $r, $r, 180, 90); $p.AddArc($x1 - $r, $y0, $r, $r, 270, 90)
  $p.AddArc($x1 - $r, $y1 - $r, $r, $r, 0, 90); $p.AddArc($x0, $y1 - $r, $r, $r, 90, 90); $p.CloseFigure()
  # Pie del monitor
  $pie = @(@(25, 46), @(39, 46), @(42, 57), @(22, 57)) | ForEach-Object { New-Object System.Drawing.PointF ($ox + $_[0] * $s), ($oy + $_[1] * $s) }
  $p.AddPolygon([System.Drawing.PointF[]]$pie)
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0xE2, 0xA6, 0x0F))), $p)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(0x0B, 0x0B, 0x0D)), (6.5 * $s)
  $pen.LineJoin = 'Miter'; $pen.StartCap = 'Square'; $pen.EndCap = 'Square'
  $pts = @(@(21, 15), @(43, 15), @(21, 38), @(43, 38)) | ForEach-Object { New-Object System.Drawing.PointF ($ox + $_[0] * $s), ($oy + $_[1] * $s) }
  $g.DrawLines($pen, [System.Drawing.PointF[]]$pts)
  # Nombre.
  $font = New-Object System.Drawing.Font 'Segoe UI Semibold', 54, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString('ZentryDesk', $font, (New-Object System.Drawing.SolidBrush $text), 118, 18)
  $g.Dispose(); $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  Write-Host "ok $file"
}
Draw-Logo (Join-Path $out 'logo_dark.png') ([System.Drawing.Color]::White)
Draw-Logo (Join-Path $out 'logo_light.png') ([System.Drawing.Color]::FromArgb(0x0B, 0x0B, 0x0D))
Copy-Item (Join-Path $out 'logo_light.png') (Join-Path $out 'logo.png')
