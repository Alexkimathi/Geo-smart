import { Resend } from 'resend'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string[]
  subject: string
  html: string
}): Promise<boolean> {
  if (to.length === 0) return false
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
    return true
  } catch (err) {
    console.error('[notifications] sendEmail failed:', err)
    return false
  }
}
