import QRCode from 'qrcode'

export async function generateQRCode(token: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(token)
    return qrDataUrl
  } catch (err) {
    console.error('Error generating QR code:', err)
    throw err
  }
}
