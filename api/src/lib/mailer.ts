import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { prisma } from './prisma.js'
import { decryptOptional } from './crypto.js'

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

// ── Provider 3: DB-based SMTP (self-hosted UI config) ──────
async function getDbSmtpTransport() {
  const config = await prisma.smtpConfig.findFirst({ where: { enabled: true } })
  if (!config) return null
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: decryptOptional(config.password) },
  })
}

async function getSmtpFrom() {
  // Env-based SMTP sender
  if (process.env.SMTP_FROM_EMAIL) {
    return `"${process.env.SMTP_FROM_NAME ?? 'Babything'}" <${process.env.SMTP_FROM_EMAIL}>`
  }
  // DB-based SMTP sender
  const config = await prisma.smtpConfig.findFirst({ where: { enabled: true } })
  if (!config) return null
  return `"${config.fromName}" <${config.fromEmail}>`
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

  // 3. Try DB-based SMTP (self-hosted UI config)
  const dbTransport = await getDbSmtpTransport()
  if (dbTransport) {
    await dbTransport.sendMail({
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
    html: `
      <p>Hi {{name}},</p>
      <p>Welcome to Babything! Your account has been created successfully.</p>
      <p><a href="{{appUrl}}" style="background:#ef5144;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Open Babything</a></p>
      <p>If you have any questions, just reply to this email.</p>
    `,
  },
  invite: {
    subject: '{{inviterName}} invited you to track {{babyName}} on Babything',
    html: `
      <p>Hi there,</p>
      <p><strong>{{inviterName}}</strong> has invited you to help track <strong>{{babyName}}</strong> on Babything.</p>
      <p><a href="{{inviteUrl}}" style="background:#ef5144;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Accept invite</a></p>
      <p>This link expires in 7 days.</p>
    `,
  },
  password_reset: {
    subject: 'Reset your Babything password',
    html: `
      <p>Hi {{name}},</p>
      <p>You requested a password reset for your Babything account.</p>
      <p><a href="{{resetUrl}}" style="background:#ef5144;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Reset password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  },
  report: {
    subject: 'Pediatric Report for {{babyName}}',
    html: `
      <p>Hi,</p>
      <p>Please find attached the pediatric report for <strong>{{babyName}}</strong>, generated by Babything.</p>
      <p style="color:#78716c;font-size:12px;">This report was generated at your request and contains health tracking data.</p>
    `,
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

  const dbTransport = await getDbSmtpTransport()
  if (!dbTransport) throw new Error('Email not configured')
  await dbTransport.verify()
  await dbTransport.sendMail({
    from: await getSmtpFrom() ?? undefined,
    to,
    subject: 'Babything — Email test',
    text: 'SMTP is configured correctly.',
  })
}
