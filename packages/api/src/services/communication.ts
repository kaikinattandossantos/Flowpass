import { Resend } from 'resend'
import axios from 'axios'

let resendClient: Resend | null = null
let resendWarningLogged = false

function isUsableResendKey(key: string | undefined): key is string {
  if (!key || key.trim() === '') return false
  if (/placeholder|your-|re_\.\.\./i.test(key)) return false
  if (!key.startsWith('re_')) return false
  return true
}

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY

  if (!isUsableResendKey(key)) {
    if (!resendWarningLogged) {
      console.warn(
        '[communication] RESEND_API_KEY ausente ou placeholder — envio de e-mail desabilitado'
      )
      resendWarningLogged = true
    }
    return null
  }

  if (!resendClient) {
    resendClient = new Resend(key)
  }

  return resendClient
}

export async function sendConfirmationEmail(data: {
  email: string,
  name: string,
  eventName: string,
  qrCodeUrl: string,
  companyName: string
}) {
  const resend = getResendClient()
  if (!resend) return

  try {
    await resend.emails.send({
      from: 'FlowPass <no-reply@flowpass.com>',
      to: data.email,
      subject: `Confirmação de Inscrição - ${data.eventName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Olá, ${data.name}!</h1>
          <p>Sua inscrição para o evento <strong>${data.eventName}</strong> foi confirmada.</p>
          <div style="text-align: center; margin: 30px 0;">
            <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
          </div>
          <p>Apresente este QR Code na entrada do evento.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">Enviado por ${data.companyName} via FlowPass</p>
        </div>
      `
    })
  } catch (err) {
    console.error('Failed to send email:', err)
  }
}

export async function sendWhatsAppMessage(data: {
  phone: string,
  name: string,
  eventName: string,
  qrCodeUrl: string
}) {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!apiUrl || !apiKey || !instance) return
  if (/placeholder|your-/i.test(apiUrl + apiKey + instance)) return

  try {
    await axios.post(`${apiUrl}/message/sendMedia/${instance}`, {
      number: data.phone,
      media: data.qrCodeUrl,
      mediaType: 'image',
      caption: `Olá ${data.name}! Aqui está seu QR code para ${data.eventName}. Apresente na entrada.`
    }, {
      headers: { 'apikey': apiKey }
    })
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err)
  }
}
