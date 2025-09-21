Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("C:\Users\macross27\Documents\st_configurator\screenshot.png", [System.Drawing.Imaging.ImageFormat]::PNG)
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved to screenshot.png"