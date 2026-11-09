Add-Type -AssemblyName System.Drawing

$srcLogoPath = 'C:\Users\imadh\Desktop\4nPlanet\src\assets\logo.png'
$srcWhiteLogoPath = 'C:\Users\imadh\Desktop\4nPlanet\src\assets\4N Planet POS System Logo.png'
$publicDir = 'C:\Users\imadh\Desktop\4nPlanet\public'

function Resize-Image {
    param(
        [string]$sourcePath,
        [string]$destPath,
        [int]$width,
        [int]$height,
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent,
        [int]$contentPadding = 0
    )
    $srcImg = [System.Drawing.Image]::FromFile($sourcePath)
    $destBmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        $brush = [System.Drawing.SolidBrush]::new($bgColor)
        $g.FillRectangle($brush, 0, 0, $width, $height)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $destW = $width - ($contentPadding * 2)
    $destH = $height - ($contentPadding * 2)
    $destX = $contentPadding
    $destY = $contentPadding

    $g.DrawImage($srcImg, $destX, $destY, $destW, $destH)
    $g.Dispose()
    $srcImg.Dispose()

    # Save as PNG
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated: $destPath ($width x $height)"
}

$white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$trans = [System.Drawing.Color]::Transparent

# 1. Standard transparent icons (for any purpose / PWA)
Resize-Image $srcLogoPath "$publicDir\icon-192.png" 192 192 $trans 0
Resize-Image $srcLogoPath "$publicDir\icon-512.png" 512 512 $trans 0

# 2. Maskable icons (with white background and safe zone padding for Android adaptive icons)
Resize-Image $srcLogoPath "$publicDir\icon-maskable-192.png" 192 192 $white 24
Resize-Image $srcLogoPath "$publicDir\icon-maskable-512.png" 512 512 $white 64

# 3. Apple Touch Icons (solid white background, iOS expects opaque 180x180)
Resize-Image $srcLogoPath "$publicDir\apple-touch-icon.png" 180 180 $white 16
Resize-Image $srcLogoPath "$publicDir\apple-touch-icon-180x180.png" 180 180 $white 16
Resize-Image $srcLogoPath "$publicDir\apple-touch-icon-152x152.png" 152 152 $white 14
Resize-Image $srcLogoPath "$publicDir\apple-touch-icon-167x167.png" 167 167 $white 15

# 4. Browser favicons
Resize-Image $srcLogoPath "$publicDir\favicon-32x32.png" 32 32 $trans 0
Resize-Image $srcLogoPath "$publicDir\favicon-16x16.png" 16 16 $trans 0
Resize-Image $srcLogoPath "$publicDir\favicon-48x48.png" 48 48 $trans 0

Write-Host "All mobile & PWA icons successfully generated!"

