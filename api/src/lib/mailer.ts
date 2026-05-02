import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { prisma } from './prisma.js'

// ── Provider 1: Resend (cloud, preferred) ──────────────────
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.FROM_EMAIL ?? 'hello@babything.app'
const fromName = process.env.FROM_NAME ?? 'Babything'

function getResendClient() {
  if (!resendApiKey) return null
  return new Resend(resendApiKey)
}

const resendClient = getResendClient()

// ── Provider 2: Env-based SMTP (cloud or self-hosted) ──────
function getEnvSmtpTransport() {
  const host = process.env.SMTP_HOST
  if (!host) return null
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
  })
}

async function getSmtpFrom() {
  if (process.env.SMTP_FROM_EMAIL) {
    return `"${process.env.SMTP_FROM_NAME ?? 'Babything'}" <${process.env.SMTP_FROM_EMAIL}>`
  }
  return null
}

// Simple variable substitution: {{variableName}}
function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? '')
}

async function renderTemplate(
  name: string,
  vars: Record<string, string>
): Promise<{ subject: string; html: string } | null> {
  const tpl = await prisma.emailTemplate.findUnique({ where: { name } })
  if (!tpl) return null
  return {
    subject: interpolate(tpl.subject, vars),
    html: interpolate(tpl.htmlBody, vars),
  }
}

async function sendEmail(
  to: string,
  templateName: string,
  vars: Record<string, string>,
  defaults: { subject: string; html: string },
  opts?: { attachments?: any[]; requireTransport?: boolean }
) {
  const rendered = await renderTemplate(templateName, vars)
  const subject = rendered?.subject ?? interpolate(defaults.subject, vars)
  const html = rendered?.html ?? interpolate(defaults.html, vars)

  // 1. Try Resend first (cloud preferred)
  if (resendClient) {
    await resendClient.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
      attachments: opts?.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
      })),
    })
    return
  }

  // 2. Try env-based SMTP
  const envTransport = getEnvSmtpTransport()
  if (envTransport) {
    await envTransport.sendMail({
      from: await getSmtpFrom() ?? undefined,
      to,
      subject,
      html,
      attachments: opts?.attachments,
    })
    return
  }

  // No transport available
  if (opts?.requireTransport) throw new Error('Email not configured')
}

// ── Default email templates ────────────────────────────────
export const defaultEmailTemplates: Record<string, { subject: string; html: string }> = {
  welcome: {
    subject: 'Welcome to Babything, {{name}}!',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Babything</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1c1917;">Welcome to Babything!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;">Hi {{name}},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44403c;">Your account has been created successfully. Babything helps families track feedings, diapers, sleep, and growth — all in one place.</p>
              <a href="{{appUrl}}" style="display:inline-block;background-color:#ef5144;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:500;">Open Babything</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:24px 0 0;font-size:13px;color:#78716c;">If you have any questions, just reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  invite: {
    subject: '{{inviterName}} invited you to track {{babyName}} on Babything',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Babything</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1c1917;">You're Invited!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;"><strong>{{inviterName}}</strong> has invited you to help track <strong>{{babyName}}</strong> on Babything.</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44403c;">Join the family to log feedings, diapers, sleep, and milestones together.</p>
              <a href="{{inviteUrl}}" style="display:inline-block;background-color:#ef5144;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:500;">Accept Invite</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:24px 0 0;font-size:13px;color:#78716c;">This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  password_reset: {
    subject: 'Reset your Babything password',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1c1917;">Reset Your Password</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;">Hi {{name}},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44403c;">You requested a password reset for your Babything account. Click the button below to choose a new password.</p>
              <a href="{{resetUrl}}" style="display:inline-block;background-color:#ef5144;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:500;">Reset Password</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:24px 0 0;font-size:13px;color:#78716c;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  report: {
    subject: 'Pediatric Report for {{babyName}}',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pediatric Report</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1c1917;">Pediatric Report</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;">Please find attached the pediatric report for <strong>{{babyName}}</strong>, generated by Babything.</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">You can share this report with your pediatrician or keep it for your records.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:24px 0 0;font-size:13px;color:#78716c;">This report was generated at your request and contains health tracking data.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
}

// ── Welcome email (new registration) ───────────────────────
export async function sendWelcomeEmail(to: string, name: string, appUrl: string) {
  await sendEmail(to, 'welcome', { name, appUrl }, defaultEmailTemplates.welcome)
}

// ── Invite email ───────────────────────────────────────────
export async function sendInviteEmail(to: string, babyName: string, inviterName: string, inviteUrl: string) {
  await sendEmail(to, 'invite', { babyName, inviterName, inviteUrl }, defaultEmailTemplates.invite)
}

// ── Password reset email ───────────────────────────────────
export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await sendEmail(to, 'password_reset', { name, resetUrl }, defaultEmailTemplates.password_reset)
}

// ── Report email (with PDF attachment) ─────────────────────
export async function sendReportEmail(to: string, babyName: string, pdfBuffer: Buffer, filename: string) {
  await sendEmail(
    to,
    'report',
    { babyName },
    defaultEmailTemplates.report,
    {
      requireTransport: true,
      attachments: [{
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    }
  )
}

// ── Send a test email using a template with sample variables ─
export async function sendTemplateTestEmail(
  to: string,
  templateName: string,
  vars: Record<string, string>
) {
  const defaults = defaultEmailTemplates[templateName]
  if (!defaults) throw new Error(`Unknown template: ${templateName}`)
  await sendEmail(to, templateName, vars, defaults, { requireTransport: true })
}

// ── Test email ─────────────────────────────────────────────
export async function sendTestEmail(to: string) {
  if (resendClient) {
    await resendClient.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: 'Babything — Email test',
      text: 'Cloud email is configured correctly.',
    })
    return
  }

  const envTransport = getEnvSmtpTransport()
  if (envTransport) {
    await envTransport.verify()
    await envTransport.sendMail({
      from: await getSmtpFrom() ?? undefined,
      to,
      subject: 'Babything — Email test',
      text: 'SMTP is configured correctly.',
    })
    return
  }

  throw new Error('Email not configured')
}
