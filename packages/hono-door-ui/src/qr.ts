import QRCode from 'qrcode-terminal/vendor/QRCode/index.js'
import QRErrorCorrectLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel.js'

export function generateQrCodeSvg(url: string): string {
  const qrcode = new QRCode(-1, QRErrorCorrectLevel.L)
  qrcode.addData(url)
  qrcode.make()

  const moduleCount = qrcode.getModuleCount()
  const quietZone = 4
  const size = moduleCount + quietZone * 2
  const rects: string[] = []

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qrcode.isDark(row, col)) {
        rects.push(`<rect x="${col + quietZone}" y="${row + quietZone}" width="1" height="1"/>`)
      }
    }
  }

  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${rects.join('')}</g></svg>`
}
