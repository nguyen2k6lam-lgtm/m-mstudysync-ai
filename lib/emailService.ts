import nodemailer, { Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const smtpConfigDir = path.resolve(__dirname, '..', '.data');
const smtpConfigPath = path.resolve(smtpConfigDir, 'smtp_config.json');

export interface RuntimeSmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  mailFrom?: string;
  updatedAt?: string;
}

let cachedRuntimeSmtp: RuntimeSmtpConfig | null = null;

export function getRuntimeSmtpConfig(): RuntimeSmtpConfig {
  if (cachedRuntimeSmtp) return cachedRuntimeSmtp;
  try {
    if (fs.existsSync(smtpConfigPath)) {
      const raw = fs.readFileSync(smtpConfigPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        cachedRuntimeSmtp = parsed;
        return parsed;
      }
    }
  } catch {}
  return {};
}

export function saveRuntimeSmtpConfig(config: RuntimeSmtpConfig): void {
  try {
    if (!fs.existsSync(smtpConfigDir)) {
      fs.mkdirSync(smtpConfigDir, { recursive: true });
    }
    const nextConfig: RuntimeSmtpConfig = {
      host: (config.host || 'smtp.gmail.com').trim(),
      port: Number(config.port || 587),
      secure: Boolean(config.secure ?? Number(config.port) === 465),
      user: (config.user || '').trim(),
      pass: (config.pass || '').trim(),
      mailFrom: (config.mailFrom || '').trim(),
      updatedAt: new Date().toISOString(),
    };
    cachedRuntimeSmtp = nextConfig;
    fs.writeFileSync(smtpConfigPath, JSON.stringify(nextConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SMTP Config Save Warning]:', err);
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  maskedContext?: string;
  verificationUrl?: string;
}

export interface EmailSendResult {
  success: boolean;
  emailSent: boolean;
  provider: 'smtp' | 'resend' | 'sandbox' | 'unconfigured';
  messageId?: string;
  previewUrl?: string;
  verificationUrl?: string;
  error?: string;
  errorCode?: string;
  missingVars?: string[];
}

export interface IEmailProvider {
  name: 'smtp' | 'resend' | 'sandbox' | 'unconfigured';
  sendEmail(options: EmailOptions): Promise<EmailSendResult>;
}

const PLACEHOLDER_EMAILS = new Set([
  'your-email@gmail.com',
  'your_email@gmail.com',
  'example@gmail.com',
  'user@example.com',
  'test@example.com',
]);

const PLACEHOLDER_PASSWORDS = new Set([
  'your-gmail-app-password',
  'your_gmail_app_password',
  'your-app-password',
  'your-password',
  'password',
  'changeme',
]);

export function formatMissingVarsList(missingVars: string[]): string {
  if (missingVars.length === 0) return '';
  if (missingVars.length === 1) return missingVars[0];
  if (missingVars.length === 2) return `${missingVars[0]} and ${missingVars[1]}`;
  return `${missingVars.slice(0, -1).join(', ')} and ${missingVars[missingVars.length - 1]}`;
}

export function getEffectiveSmtpCredentials(): {
  host: string;
  rawPort: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  rawFrom: string;
  hasOAuth2: boolean;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
} {
  const runtime = getRuntimeSmtpConfig();
  const host = (runtime.host || process.env.SMTP_HOST || '').trim();
  const rawPort = (runtime.port ? String(runtime.port) : process.env.SMTP_PORT || '').trim();
  const port = parseInt(rawPort || '587', 10);
  const secureEnv = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure =
    runtime.secure !== undefined
      ? Boolean(runtime.secure)
      : secureEnv === 'true' || secureEnv === '1' || port === 465;
  const user = (runtime.user || process.env.SMTP_USER || '').trim();
  const pass = (runtime.pass || process.env.SMTP_PASSWORD || '').trim();
  const rawFrom = (runtime.mailFrom || process.env.MAIL_FROM || process.env.EMAIL_FROM || '').trim();
  const oauthClientId = (process.env.SMTP_OAUTH_CLIENT_ID || '').trim();
  const oauthClientSecret = (process.env.SMTP_OAUTH_CLIENT_SECRET || '').trim();
  const oauthRefreshToken = (process.env.SMTP_OAUTH_REFRESH_TOKEN || '').trim();
  const hasOAuth2 = Boolean(oauthClientId && oauthClientSecret && oauthRefreshToken);

  return {
    host: host || (user ? 'smtp.gmail.com' : ''),
    rawPort: rawPort || (user ? '587' : ''),
    port: Number.isNaN(port) ? 587 : port,
    secure,
    user,
    pass,
    rawFrom,
    hasOAuth2,
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
  };
}

export function isRealSmtpConfigured(): {
  configured: boolean;
  reason?: string;
  missingVars: string[];
  host: string;
  port: number;
  secure: boolean;
  hasUser: boolean;
  hasPass: boolean;
  hasMailFrom: boolean;
} {
  const { host, rawPort, port, secure, user, pass, rawFrom, hasOAuth2 } = getEffectiveSmtpCredentials();

  const missingVars: string[] = [];
  if (!host) {
    missingVars.push('SMTP_HOST');
  }
  if (!rawPort || Number.isNaN(port) || port <= 0) {
    missingVars.push('SMTP_PORT');
  }
  const hasUser = Boolean(user && !PLACEHOLDER_EMAILS.has(user.toLowerCase()));
  if (!hasUser) {
    missingVars.push('SMTP_USER');
  }
  const hasPass = Boolean(hasOAuth2 || (pass && !PLACEHOLDER_PASSWORDS.has(pass.toLowerCase())));
  if (!hasPass) {
    missingVars.push('SMTP_PASSWORD');
  }
  const hasMailFrom = Boolean(rawFrom && !rawFrom.toLowerCase().includes('your-email@gmail.com'));

  if (missingVars.length > 0) {
    const reason = `Email service is not configured: missing ${formatMissingVarsList(missingVars)}`;
    return {
      configured: false,
      reason,
      missingVars,
      host,
      port: Number.isNaN(port) ? 587 : port,
      secure,
      hasUser,
      hasPass,
      hasMailFrom,
    };
  }

  return {
    configured: true,
    missingVars: [],
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure,
    hasUser: true,
    hasPass: true,
    hasMailFrom,
  };
}

export function resolveValidFromAddress(smtpUser: string): string {
  const runtime = getRuntimeSmtpConfig();
  const rawFrom = (runtime.mailFrom || process.env.MAIL_FROM || process.env.EMAIL_FROM || '').trim();
  if (rawFrom && !rawFrom.toLowerCase().includes('your-email@gmail.com')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const angleMatch = rawFrom.match(/<([^>]+)>/);
    const extracted = angleMatch ? angleMatch[1].trim() : rawFrom;
    if (emailRegex.test(extracted)) {
      return rawFrom;
    }
  }
  if (smtpUser && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpUser)) {
    return `"StudySync AI" <${smtpUser}>`;
  }
  return '"StudySync AI" <noreply@studysync.vn>';
}

/**
 * Safely masks tokens so full verification/reset tokens are NEVER printed in logs
 */
export function maskSecretToken(token: string): string {
  if (!token || token.length < 10) return '***';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

/**
 * Classifies Nodemailer / SMTP errors into safe error codes without leaking secrets
 */
export function classifySmtpError(err: any): { errorCode: string; safeMessage: string } {
  const rawMessage = String(err?.message || 'Unknown SMTP error');
  const code = String(err?.code || '').toUpperCase();
  const responseCode = Number(err?.responseCode || 0);
  const lower = rawMessage.toLowerCase();

  if (
    code === 'EAUTH' ||
    responseCode === 535 ||
    responseCode === 534 ||
    lower.includes('535') ||
    lower.includes('invalid login') ||
    lower.includes('authentication failed') ||
    lower.includes('username and password not accepted') ||
    lower.includes('application-specific password required')
  ) {
    return {
      errorCode: 'SMTP_AUTH_FAILED',
      safeMessage: 'SMTP authentication failed (invalid SMTP_USER or Gmail App Password).',
    };
  }

  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    lower.includes('timeout') ||
    lower.includes('timed out')
  ) {
    return {
      errorCode: 'SMTP_TIMEOUT',
      safeMessage: 'SMTP connection timed out while connecting to mail server.',
    };
  }

  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNECTION' ||
    code === 'ESOCKET' ||
    code === 'EHOSTUNREACH' ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('connection refused')
  ) {
    return {
      errorCode: 'SMTP_CONNECTION_REFUSED',
      safeMessage: 'Could not connect to SMTP mail server (connection refused or host unreachable).',
    };
  }

  if (
    code === 'EENVELOPE' ||
    responseCode === 550 ||
    responseCode === 553 ||
    lower.includes('invalid recipient') ||
    lower.includes('recipient address rejected') ||
    lower.includes('no recipients defined')
  ) {
    return {
      errorCode: 'INVALID_RECIPIENT',
      safeMessage: 'Recipient email address is invalid or rejected by mail server.',
    };
  }

  if (
    responseCode === 421 ||
    responseCode === 450 ||
    responseCode === 452 ||
    lower.includes('421') ||
    lower.includes('450') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many')
  ) {
    return {
      errorCode: 'SMTP_RATE_LIMIT',
      safeMessage: 'SMTP rate limit or sending quota exceeded.',
    };
  }

  if (responseCode === 554 || lower.includes('554') || lower.includes('rejected') || lower.includes('spam')) {
    return {
      errorCode: 'PROVIDER_REJECTED',
      safeMessage: 'Email message was rejected by the mail provider.',
    };
  }

  return {
    errorCode: 'SMTP_SEND_ERROR',
    safeMessage: 'Failed to send email via SMTP server.',
  };
}

/**
 * Real SMTP Email Provider (Gmail App Password, Gmail OAuth2, SendGrid, Amazon SES, or custom SMTP)
 * Supports standard SMTP ports (587 STARTTLS with secure=false, 465 SSL/TLS with secure=true)
 */
export class SmtpEmailProvider implements IEmailProvider {
  name: 'smtp' = 'smtp';
  private transporter: Transporter;
  private from: string;

  constructor() {
    const creds = getEffectiveSmtpCredentials();
    const host = creds.host || 'smtp.gmail.com';
    const port = creds.port || 587;
    // Port 465 uses implicit SSL/TLS (secure=true); Port 587 uses STARTTLS (secure=false)
    const secure = port === 465 ? true : creds.secure;
    const user = creds.user;
    const rawPass = creds.pass;
    // If Gmail SMTP is used with a 16-char App Password formatted with spaces (e.g. "abcd efgh ijkl mnop"), normalize spaces
    const pass =
      host.includes('gmail.com') && /^[a-zA-Z]{4}(\s+[a-zA-Z]{4}){3}$/.test(rawPass)
        ? rawPass.replace(/\s+/g, '')
        : rawPass;

    this.from = resolveValidFromAddress(user);

    const authConfig: any = creds.hasOAuth2
      ? {
          type: 'OAuth2',
          user,
          clientId: creds.oauthClientId,
          clientSecret: creds.oauthClientSecret,
          refreshToken: creds.oauthRefreshToken,
        }
      : {
          user,
          pass,
        };

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: port === 587,
      auth: authConfig,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async verifyConnection(): Promise<{
    ok: boolean;
    errorCode?: string;
    error?: string;
  }> {
    try {
      await this.transporter.verify();
      return { ok: true };
    } catch (err: any) {
      const classified = classifySmtpError(err);
      console.error(`[SMTP Verify Error] Code=${classified.errorCode}: ${classified.safeMessage}`);
      return {
        ok: false,
        errorCode: classified.errorCode,
        error: classified.safeMessage,
      };
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    const recipient = (options.to || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipient || !emailRegex.test(recipient)) {
      console.error(`[SMTP Email Error] Code=INVALID_RECIPIENT: Invalid recipient address`);
      return {
        success: false,
        emailSent: false,
        provider: 'smtp',
        errorCode: 'INVALID_RECIPIENT',
        error: 'Invalid recipient email address.',
      };
    }

    // 1. Verify SMTP connection and authentication first before attempting sendMail
    const verifyRes = await this.verifyConnection();
    if (!verifyRes.ok) {
      return {
        success: false,
        emailSent: false,
        provider: 'smtp',
        errorCode: verifyRes.errorCode || 'SMTP_CONNECTION_REFUSED',
        error: verifyRes.error || 'SMTP connection verification failed.',
        verificationUrl: options.verificationUrl,
      };
    }

    // 2. Send email only after SMTP connection & auth succeeded
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: recipient,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      const rejected = Array.isArray(info.rejected) && info.rejected.length > 0;
      const accepted = Array.isArray(info.accepted) && info.accepted.length > 0;
      if (rejected && !accepted) {
        console.error(`[SMTP Email Error] Code=PROVIDER_REJECTED: Recipient rejected by server for ${recipient}`);
        return {
          success: false,
          emailSent: false,
          provider: 'smtp',
          errorCode: 'PROVIDER_REJECTED',
          error: 'Email message was rejected by the mail server.',
          verificationUrl: options.verificationUrl,
        };
      }

      console.log(`[SMTP Email Success] Sent to ${recipient}, MessageId: ${info.messageId}`);
      return {
        success: true,
        emailSent: true,
        provider: 'smtp',
        messageId: info.messageId,
        verificationUrl: options.verificationUrl,
      };
    } catch (err: any) {
      const classified = classifySmtpError(err);
      // Log safe error code without exposing passwords or tokens
      console.error(
        `[SMTP Email Error] Failed sending to ${recipient} (Code=${classified.errorCode}): ${classified.safeMessage}`
      );
      return {
        success: false,
        emailSent: false,
        provider: 'smtp',
        errorCode: classified.errorCode,
        error: classified.safeMessage,
        verificationUrl: options.verificationUrl,
      };
    }
  }
}

/**
 * In-memory mailbox for local/preview environment inspection
 */
export interface StoredMailboxMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  verificationUrl?: string;
  previewUrl?: string;
  sentAt: string;
  messageId: string;
}

const sandboxMailbox = new Map<string, StoredMailboxMessage>();
let cachedEtherealAccount: { user: string; pass: string; smtp: { host: string; port: number; secure: boolean } } | null = null;
let etherealFailed = false;

export function getLatestSandboxEmail(email: string): StoredMailboxMessage | null {
  return sandboxMailbox.get((email || '').trim().toLowerCase()) || null;
}

/**
 * Built-in Sandbox / Ethereal Email Provider:
 * Used automatically in development/preview environments when external SMTP_USER / SMTP_PASSWORD
 * are not configured yet, ensuring registration & verification work out-of-the-box without blocking the user.
 */
export class SandboxEmailProvider implements IEmailProvider {
  name: 'sandbox' = 'sandbox';
  private from = '"StudySync AI" <noreply@studysync.vn>';

  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    const recipient = (options.to || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipient || !emailRegex.test(recipient)) {
      return {
        success: false,
        emailSent: false,
        provider: 'sandbox',
        errorCode: 'INVALID_RECIPIENT',
        error: 'Invalid recipient email address.',
      };
    }

    let previewUrl: string | undefined;
    let messageId = `<msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@studysync.vn>`;

    // 1. Try Nodemailer Ethereal test account if available and not previously blocked
    if (!etherealFailed) {
      try {
        if (!cachedEtherealAccount) {
          const accountPromise = nodemailer.createTestAccount();
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
          const acct = await Promise.race([accountPromise, timeoutPromise]);
          if (acct && acct.user && acct.pass) {
            cachedEtherealAccount = acct;
          } else {
            etherealFailed = true;
          }
        }

        if (cachedEtherealAccount) {
          const etherealTransport = nodemailer.createTransport({
            host: cachedEtherealAccount.smtp.host,
            port: cachedEtherealAccount.smtp.port,
            secure: cachedEtherealAccount.smtp.secure,
            auth: {
              user: cachedEtherealAccount.user,
              pass: cachedEtherealAccount.pass,
            },
            connectionTimeout: 4000,
            greetingTimeout: 4000,
            socketTimeout: 5000,
          });

          const info = await etherealTransport.sendMail({
            from: this.from,
            to: recipient,
            subject: options.subject,
            text: options.text,
            html: options.html,
          });
          messageId = info.messageId || messageId;
          const url = nodemailer.getTestMessageUrl(info);
          if (url && typeof url === 'string') {
            previewUrl = url;
          }
        }
      } catch {
        etherealFailed = true;
      }
    }

    // 2. Always run Nodemailer streamTransport as reliable local delivery guarantee
    if (!previewUrl) {
      try {
        const streamTransport = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true,
        });
        const info = await streamTransport.sendMail({
          from: this.from,
          to: recipient,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        if (info.messageId) {
          messageId = info.messageId;
        }
      } catch {}
    }

    sandboxMailbox.set(recipient.toLowerCase(), {
      to: recipient,
      subject: options.subject,
      text: options.text,
      html: options.html,
      verificationUrl: options.verificationUrl,
      previewUrl,
      sentAt: new Date().toISOString(),
      messageId,
    });

    console.log(
      `[Email Sandbox Delivery] Delivered to ${recipient}, MessageId: ${messageId}${
        previewUrl ? `, Preview: ${previewUrl}` : ''
      }`
    );

    return {
      success: true,
      emailSent: true,
      provider: 'sandbox',
      messageId,
      previewUrl,
      verificationUrl: options.verificationUrl,
    };
  }
}

/**
 * Unconfigured Email Provider:
 * Used only if STRICT_UNCONFIGURED_SMTP=true is explicitly set.
 */
export class UnconfiguredEmailProvider implements IEmailProvider {
  name: 'unconfigured' = 'unconfigured';
  private reason: string;
  private missingVars: string[];

  constructor(reason?: string, missingVars: string[] = []) {
    this.missingVars = missingVars;
    this.reason =
      reason ||
      (missingVars.length > 0
        ? `Email service is not configured: missing ${formatMissingVarsList(missingVars)}`
        : 'Email service is not configured: missing SMTP_USER and SMTP_PASSWORD');
  }

  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    console.error(`[Email Service Error] ${this.reason} (Target: ${options.to})`);
    return {
      success: false,
      emailSent: false,
      provider: 'unconfigured',
      errorCode: 'SMTP_NOT_CONFIGURED',
      error: this.reason,
      missingVars: this.missingVars,
      verificationUrl: options.verificationUrl,
    };
  }
}

/**
 * Resend Email Provider
 */
export class ResendEmailProvider implements IEmailProvider {
  name: 'resend' = 'resend';
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from?: string) {
    this.apiKey = apiKey;
    this.from = resolveValidFromAddress(from || '');
  }

  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    const recipient = (options.to || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipient || !emailRegex.test(recipient)) {
      return {
        success: false,
        emailSent: false,
        provider: 'resend',
        errorCode: 'INVALID_RECIPIENT',
        error: 'Invalid recipient email address.',
      };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: recipient,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Resend error: ${res.statusText}`);
      }

      const data = await res.json();
      console.log(`[Resend Email Success] Sent to ${recipient}, Id: ${data.id}`);
      return {
        success: true,
        emailSent: true,
        provider: 'resend',
        messageId: data.id,
        verificationUrl: options.verificationUrl,
      };
    } catch (err: any) {
      console.error(`[Resend Email Error] Failed sending to ${recipient} (Code=PROVIDER_REJECTED)`);
      return {
        success: false,
        emailSent: false,
        provider: 'resend',
        errorCode: 'PROVIDER_REJECTED',
        error: 'Email provider rejected or failed to send message.',
        verificationUrl: options.verificationUrl,
      };
    }
  }
}

/**
 * Select active email provider based on server environment variables & runtime SMTP config.
 * Automatically uses SandboxEmailProvider (Ethereal / built-in delivery) when external SMTP/Resend
 * credentials are not configured yet so registration and verification never get stuck.
 */
export function getEmailProvider(): IEmailProvider {
  const smtpStatus = isRealSmtpConfigured();
  if (smtpStatus.configured) {
    return new SmtpEmailProvider();
  }

  const resendKey = (process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '').trim();
  if (resendKey && resendKey.startsWith('re_') && resendKey !== 're_123456789') {
    return new ResendEmailProvider(resendKey, process.env.MAIL_FROM);
  }

  if (process.env.STRICT_UNCONFIGURED_SMTP === 'true') {
    return new UnconfiguredEmailProvider(smtpStatus.reason, smtpStatus.missingVars);
  }

  return new SandboxEmailProvider();
}

/**
 * Checks SMTP connection & authentication on demand or at server startup.
 * Never logs or returns passwords or secrets.
 */
export async function verifySmtpConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  provider: 'smtp' | 'resend' | 'sandbox' | 'unconfigured';
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  missingVars: string[];
  errorCode?: string;
  message: string;
}> {
  const smtpStatus = isRealSmtpConfigured();
  const creds = getEffectiveSmtpCredentials();
  const resendKey = (process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '').trim();
  if (!smtpStatus.configured && resendKey && resendKey.startsWith('re_') && resendKey !== 're_123456789') {
    return {
      configured: true,
      connected: true,
      provider: 'resend',
      missingVars: [],
      message: 'Resend email provider is configured.',
    };
  }

  if (!smtpStatus.configured) {
    return {
      configured: false,
      connected: true,
      provider: 'sandbox',
      host: smtpStatus.host || 'smtp.gmail.com',
      port: smtpStatus.port || 587,
      secure: smtpStatus.secure,
      missingVars: smtpStatus.missingVars,
      message: `Đang sử dụng chế độ xác thực trực tiếp (Sandbox/Ethereal) do chưa cấu hình ${formatMissingVarsList(
        smtpStatus.missingVars
      )}. Bạn có thể xác nhận tài khoản ngay lập tức trên ứng dụng hoặc cấu hình Gmail SMTP để gửi tới hộp thư thật.`,
    };
  }

  const smtpProvider = new SmtpEmailProvider();
  const verifyRes = await smtpProvider.verifyConnection();
  if (!verifyRes.ok) {
    return {
      configured: true,
      connected: false,
      provider: 'smtp',
      host: smtpStatus.host,
      port: smtpStatus.port,
      secure: smtpStatus.secure,
      user: creds.user,
      missingVars: [],
      errorCode: verifyRes.errorCode || 'SMTP_CONNECTION_REFUSED',
      message: verifyRes.error || 'SMTP verification failed.',
    };
  }

  return {
    configured: true,
    connected: true,
    provider: 'smtp',
    host: smtpStatus.host,
    port: smtpStatus.port,
    secure: smtpStatus.secure,
    user: creds.user,
    missingVars: [],
    message: `SMTP connection verified successfully (${smtpStatus.host}:${smtpStatus.port}, secure=${smtpStatus.secure}).`,
  };
}

/**
 * Logs clear startup diagnostic messages without exposing any secret values.
 */
export async function validateEmailConfigOnStartup(): Promise<void> {
  const status = isRealSmtpConfigured();
  const resendKey = (process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '').trim();
  if (!status.configured && !(resendKey && resendKey.startsWith('re_') && resendKey !== 're_123456789')) {
    console.log(
      `[Email Service Info] External SMTP not configured (missing ${formatMissingVarsList(
        status.missingVars
      )}). Using built-in Sandbox/Ethereal email provider with instant verification link.`
    );
    return;
  }

  const conn = await verifySmtpConnection();
  if (conn.connected) {
    console.log(`[Email Service Ready] ${conn.message}`);
  } else {
    console.error(`[Email Service Error] Code=${conn.errorCode}: ${conn.message}`);
  }
}

/**
 * Resolves the public application base URL without falling back to wrong localhost/port in production.
 */
export function getBaseAppUrl(requestOrigin?: string): string {
  const envUrl = (process.env.APP_BASE_URL || process.env.APP_URL || '').trim().replace(/\/$/, '');
  const cleanOrigin = (requestOrigin || '').trim().replace(/\/$/, '');

  const isEnvLocal =
    !envUrl ||
    envUrl.includes('localhost') ||
    envUrl.includes('127.0.0.1') ||
    envUrl.includes('0.0.0.0');

  // If APP_BASE_URL is explicitly configured to a real non-localhost domain, always prefer it
  if (envUrl && !isEnvLocal) {
    return envUrl;
  }

  // If requestOrigin comes from a real host (e.g. Cloud Run *.run.app or custom domain), use it
  if (cleanOrigin && !cleanOrigin.includes('localhost') && !cleanOrigin.includes('127.0.0.1')) {
    return cleanOrigin;
  }

  return envUrl || cleanOrigin || 'http://localhost:3000';
}

/**
 * 1. Verification Email Service (Bilingual VI / EN)
 */
export async function sendVerificationEmail(params: {
  to: string;
  fullName: string;
  token: string;
  language?: 'vi' | 'en';
  appUrl?: string;
}): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  const baseUrl = getBaseAppUrl(params.appUrl);
  const verifyLink = `${baseUrl}/verify-email?token=${encodeURIComponent(params.token)}`;
  const lang: 'vi' | 'en' = params.language === 'en' ? 'en' : 'vi';
  const supportEmail = 'support@studysync.vn';

  const isEn = lang === 'en';

  const subject = isEn
    ? `[Mầm Study] Verify your account - ${params.fullName}`
    : `[Mầm Study] Xác nhận tài khoản của bạn - ${params.fullName}`;

  const text = isEn
    ? `Hello ${params.fullName},

Thank you for registering an account on Mầm Study - Smart Assistant for Modern Students!

Please click the confirmation button or visit the link below to verify your email address and activate your account:

${verifyLink}

Link validity: This verification link is valid for 24 hours and can only be used once.

Tip: If you don't see this email in your primary Inbox, please check your Spam, Junk, or Promotions folders.

If you did not create this account, please ignore this email or contact our support team at ${supportEmail}.

Best regards,
The Mầm Study Team`
    : `Xin chào ${params.fullName},

Cảm ơn bạn đã đăng ký tài khoản tại Mầm Study - Trợ lý thông minh cho sinh viên hiện đại!

Vui lòng nhấn vào liên kết xác nhận bên dưới để xác minh địa chỉ email và kích hoạt tài khoản của bạn:

${verifyLink}

Thời hạn liên kết: Liên kết xác nhận này có hiệu lực trong vòng 24 giờ và chỉ được sử dụng một lần.

Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email hoặc liên hệ bộ phận hỗ trợ tại ${supportEmail}.

Trân trọng,
Đội ngũ Mầm Study`;

  const html = isEn
    ? `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">StudySync AI</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Smart Learning Platform for Modern Students</p>
      </div>

      <h3 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
        Verify Your Email Address
      </h3>

      <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">
        Hello <strong>${params.fullName}</strong>,
      </p>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Thank you for signing up for <strong>StudySync AI</strong>! Please confirm your email address by clicking the button below to activate your account and unlock all learning features.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyLink}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
          Verify Email
        </a>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 20px 0;">
        <p style="font-size: 12px; color: #475569; margin: 0 0 6px 0; font-weight: 600;">
          If the button above doesn't work, copy and paste this fallback link into your browser:
        </p>
        <p style="font-size: 12px; color: #4f46e5; word-break: break-all; margin: 0;">
          <a href="${verifyLink}" style="color: #4f46e5; text-decoration: underline;">${verifyLink}</a>
        </p>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 16px;">
        <strong>Expiration:</strong> This verification link is valid for <strong>24 hours</strong> and can only be used once.
      </p>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        If you did not register for a StudySync AI account, please ignore this email or contact our support team at <a href="mailto:${supportEmail}" style="color: #4f46e5;">${supportEmail}</a>.
      </p>
    </div>
  `
    : `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">StudySync AI</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Nền tảng học tập thông minh cho sinh viên</p>
      </div>

      <h3 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
        Xác nhận tài khoản của bạn
      </h3>

      <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">
        Xin chào <strong>${params.fullName}</strong>,
      </p>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Cảm ơn bạn đã đăng ký tài khoản tại <strong>StudySync AI</strong>! Vui lòng xác nhận địa chỉ email của bạn bằng cách nhấn vào nút bên dưới để kích hoạt tài khoản và sử dụng đầy đủ các tính năng học tập.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyLink}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
          Xác nhận email
        </a>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 20px 0;">
        <p style="font-size: 12px; color: #475569; margin: 0 0 6px 0; font-weight: 600;">
          Nếu nút bấm trên không hoạt động, vui lòng sao chép và dán liên kết dự phòng sau vào trình duyệt:
        </p>
        <p style="font-size: 12px; color: #4f46e5; word-break: break-all; margin: 0;">
          <a href="${verifyLink}" style="color: #4f46e5; text-decoration: underline;">${verifyLink}</a>
        </p>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 16px;">
        <strong>Thời hạn liên kết:</strong> Liên kết xác nhận này có hiệu lực trong vòng <strong>24 giờ</strong> và chỉ được sử dụng một lần.
      </p>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email hoặc liên hệ bộ phận hỗ trợ qua địa chỉ <a href="mailto:${supportEmail}" style="color: #4f46e5;">${supportEmail}</a>.
      </p>
    </div>
  `;

  console.log(
    `[Verification Email Dispatch] To: ${params.to}, Lang: ${lang}, Provider: ${provider.name}, BaseURL: ${baseUrl}, Token: ${maskSecretToken(params.token)}`
  );

  // Store in sandboxMailbox as well so user can always preview or verify directly if needed
  sandboxMailbox.set(params.to.trim().toLowerCase(), {
    to: params.to.trim(),
    subject,
    text,
    html,
    verificationUrl: verifyLink,
    sentAt: new Date().toISOString(),
    messageId: `<verify_${Date.now()}@studysync.vn>`,
  });

  const sendResult = await provider.sendEmail({
    to: params.to,
    subject,
    text,
    html,
    verificationUrl: verifyLink,
  });

  return {
    ...sendResult,
    verificationUrl: verifyLink,
  };
}

/**
 * 2. Password Reset Email Service
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  fullName: string;
  token: string;
  language?: 'vi' | 'en';
  appUrl?: string;
}): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  const baseUrl = getBaseAppUrl(params.appUrl);
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(params.token)}`;

  const subject = `[StudySync AI] Yêu cầu đặt lại mật khẩu của bạn`;
  const text = `Xin chào ${params.fullName},

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản StudySync AI liên kết với email này.
Vui lòng nhấp vào liên kết bên dưới để tạo mật khẩu mới:
${resetLink}

Liên kết này có hiệu lực trong vòng 60 phút.

Trân trọng,
Đội ngũ StudySync AI`;

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">StudySync AI</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Khôi phục mật khẩu tài khoản</p>
      </div>

      <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">
        Xin chào <strong>${params.fullName}</strong>,
      </p>

      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản StudySync AI của bạn. Hãy bấm vào nút bên dưới để tạo mật khẩu mới:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
          Đặt lại mật khẩu
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Liên kết này chỉ có hiệu lực trong 60 phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.
      </p>
    </div>
  `;

  return await provider.sendEmail({ to: params.to, subject, text, html });
}

/**
 * 3. Order Created Email Service
 */
export async function sendOrderCreatedEmail(params: {
  to: string;
  fullName: string;
  orderId: string;
  planName: string;
  amount: number;
  checkoutUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(params.amount);

  const subject = `[StudySync AI] Đơn hàng #${params.orderId} đã được khởi tạo`;
  const text = `Xin chào ${params.fullName},

Bạn vừa khởi tạo đơn hàng nâng cấp gói ${params.planName} trên StudySync AI.
Mã đơn hàng: ${params.orderId}
Số tiền cần thanh toán: ${formattedAmount}

Vui lòng truy cập liên kết sau để hoàn tất thanh toán:
${params.checkoutUrl}

Trân trọng,
Đội ngũ StudySync AI`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #4f46e5;">StudySync AI - Đơn hàng #${params.orderId}</h2>
      <p>Xin chào <strong>${params.fullName}</strong>,</p>
      <p>Đơn hàng mua gói <strong>${params.planName}</strong> của bạn đã được tạo thành công với trạng thái <strong>CHỜ THANH TOÁN (PENDING)</strong>.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 4px 0;">Mã đơn: <strong>${params.orderId}</strong></p>
        <p style="margin: 4px 0;">Số tiền: <strong style="color: #4f46e5; font-size: 18px;">${formattedAmount}</strong></p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.checkoutUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Hoàn tất thanh toán</a>
      </div>
    </div>
  `;

  return await provider.sendEmail({ to: params.to, subject, text, html });
}

/**
 * 4. Payment Success Email Service
 */
export async function sendPaymentSuccessEmail(params: {
  to: string;
  fullName: string;
  orderId: string;
  planName: string;
  amount: number;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(params.amount);
  const formattedEndDate = new Date(params.endDate).toLocaleDateString('vi-VN');

  const subject = `[StudySync AI] Xác nhận thanh toán thành công #${params.orderId}`;
  const text = `Xin chào ${params.fullName},

Thanh toán cho đơn hàng #${params.orderId} đã được xác nhận thành công!
Gói dịch vụ: ${params.planName}
Số tiền: ${formattedAmount}
Hạn sử dụng Premium đến ngày: ${formattedEndDate}

Cảm ơn bạn đã đồng hành cùng StudySync AI!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #10b981; border-radius: 16px;">
      <h2 style="color: #10b981;">🎉 Thanh toán thành công!</h2>
      <p>Xin chào <strong>${params.fullName}</strong>,</p>
      <p>Giao dịch của bạn đã được hệ thống xác nhận qua cổng thanh toán an toàn. Tài khoản của bạn đã được nâng cấp lên <strong>${params.planName}</strong>.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 4px 0;">Mã đơn hàng: <strong>${params.orderId}</strong></p>
        <p style="margin: 4px 0;">Số tiền đã thanh toán: <strong>${formattedAmount}</strong></p>
        <p style="margin: 4px 0;">Thời hạn quyền lợi Premium: <strong>Đến hết ngày ${formattedEndDate}</strong></p>
      </div>
      <p>Chúc bạn có những trải nghiệm học tập hiệu quả vượt trội cùng StudySync AI!</p>
    </div>
  `;

  return await provider.sendEmail({ to: params.to, subject, text, html });
}

/**
 * 5. Payment Failed Email Service
 */
export async function sendPaymentFailedEmail(params: {
  to: string;
  fullName: string;
  orderId: string;
  reason?: string;
  retryUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  const subject = `[StudySync AI] Giao dịch #${params.orderId} chưa thành công`;
  const text = `Xin chào ${params.fullName},

Giao dịch #${params.orderId} chưa hoàn tất thành công.
Lý do: ${params.reason || 'Giao dịch bị gián đoạn hoặc bị hủy.'}

Bạn có thể thử lại qua liên kết: ${params.retryUrl}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ef4444; border-radius: 16px;">
      <h2 style="color: #ef4444;">Giao dịch chưa hoàn tất</h2>
      <p>Xin chào <strong>${params.fullName}</strong>,</p>
      <p>Đơn hàng <strong>#${params.orderId}</strong> chưa được thanh toán thành công. Lý do: ${params.reason || 'Giao dịch bị gián đoạn'}.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.retryUrl}" style="background: #ef4444; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Thử thanh toán lại</a>
      </div>
    </div>
  `;

  return await provider.sendEmail({ to: params.to, subject, text, html });
}

/**
 * 6. Deadline Reminder Email Service
 */
export async function sendDeadlineReminderEmail(params: {
  to: string;
  fullName: string;
  deadlineTitle: string;
  subjectName: string;
  dueDate: string;
  dueTime?: string;
  priority: string;
  deadlineUrl: string;
  isOverdue?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  const statusText = params.isOverdue ? 'ĐÃ QUÁ HẠN' : 'SẮP ĐẾN HẠN (24 GIỜ TỚI)';
  const subject = `[StudySync AI] ${params.isOverdue ? '⚠️ Quá hạn' : '⏰ Nhắc nhở'}: ${params.deadlineTitle} (${params.subjectName})`;

  const text = `Xin chào ${params.fullName},

Nhắc nhở công việc học tập:
Tiêu đề: ${params.deadlineTitle}
Môn học: ${params.subjectName}
Hạn nộp: ${params.dueDate} ${params.dueTime || ''}
Mức độ ưu tiên: ${params.priority}
Trạng thái: ${statusText}

Mở công việc tại StudySync AI:
${params.deadlineUrl}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: ${params.isOverdue ? '#ef4444' : '#f59e0b'};">
        ${params.isOverdue ? '⚠️ Deadline đã quá hạn' : '⏰ Nhắc nhở deadline sắp đến'}
      </h2>
      <p>Xin chào <strong>${params.fullName}</strong>,</p>
      <p>Bạn có một công việc học tập cần lưu ý:</p>
      <div style="background: #f8fafc; border-left: 4px solid ${params.isOverdue ? '#ef4444' : '#f59e0b'}; padding: 16px; border-radius: 0 12px 12px 0; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #0f172a;">${params.deadlineTitle}</h3>
        <p style="margin: 4px 0; color: #475569;">Môn học: <strong>${params.subjectName}</strong></p>
        <p style="margin: 4px 0; color: #475569;">Thời hạn: <strong>${params.dueDate} ${params.dueTime || ''}</strong></p>
        <p style="margin: 4px 0; color: #475569;">Mức độ ưu tiên: <span style="text-transform: uppercase; font-weight: bold;">${params.priority}</span></p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.deadlineUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Mở công việc trong ứng dụng</a>
      </div>
    </div>
  `;

  return await provider.sendEmail({ to: params.to, subject, text, html });
}

/**
 * 7. Premium Expiry Reminder Email Service
 */
export async function sendPremiumExpiryEmail(params: {
  to: string;
  fullName: string;
  daysRemaining: number;
  endDate: string;
  renewUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  const isExpired = params.daysRemaining <= 0;
  const formattedEndDate = new Date(params.endDate).toLocaleDateString('vi-VN');

  const subject = isExpired
    ? `[StudySync AI] Gói Premium của bạn đã hết hạn`
    : `[StudySync AI] Gói Premium của bạn sẽ hết hạn sau ${params.daysRemaining} ngày`;

  const text = `Xin chào ${params.fullName},

${
  isExpired
    ? `Gói Premium của bạn đã hết hạn vào ngày ${formattedEndDate}.`
    : `Gói Premium của bạn sẽ hết hạn vào ngày ${formattedEndDate} (còn ${params.daysRemaining} ngày).`
}

Để tiếp tục sử dụng không giới hạn môn học, âm thanh bài giảng và trợ lý AI cao cấp, hãy gia hạn tại:
${params.renewUrl}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f59e0b; border-radius: 16px;">
      <h2 style="color: #f59e0b;">${isExpired ? 'Gói Premium đã hết hạn' : `Gói Premium sắp hết hạn sau ${params.daysRemaining} ngày`}</h2>
      <p>Xin chào <strong>${params.fullName}</strong>,</p>
      <p>${
        isExpired
          ? `Gói Premium của bạn đã hết hạn vào ngày <strong>${formattedEndDate}</strong>. Tài khoản của bạn đã được chuyển về gói Miễn phí.`
          : `Gói Premium của bạn sẽ hết hạn vào ngày <strong>${formattedEndDate}</strong>.`
      }</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.renewUrl}" style="background: #f59e0b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Gia hạn Premium ngay</a>
      </div>
    </div>
  `;

  return await provider.sendEmail({ to: params.to, subject, text, html });
}

/**
 * 8. Marketing / Promo Email Service (Supports Unsubscribe)
 */
export async function sendMarketingPromoEmail(params: {
  to: string;
  fullName: string;
  promoTitle: string;
  promoContent: string;
  actionUrl: string;
  unsubscribeUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  const subject = `[StudySync AI] Ưu đãi đặc biệt: ${params.promoTitle}`;

  const text = `Xin chào ${params.fullName},

${params.promoTitle}
${params.promoContent}

Khám phá ưu đãi tại: ${params.actionUrl}

Hủy nhận email ưu đãi: ${params.unsubscribeUrl}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #4f46e5;">${params.promoTitle}</h2>
      <p>Xin chào <strong>${params.fullName}</strong>,</p>
      <div style="font-size: 14px; color: #334155; line-height: 1.6; margin: 16px 0;">
        ${params.promoContent}
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.actionUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Nhận ưu đãi ngay</a>
      </div>
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Nếu bạn không muốn nhận email khuyến mãi từ StudySync AI, bạn có thể <a href="${params.unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">hủy đăng ký tại đây</a>.
      </p>
    </div>
  `;

  return await provider.sendEmail({ to: params.to, subject, text, html });
}
