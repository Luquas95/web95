import { config } from './config';

export interface OutgoingMail {
  email: string;
  name: string;
  subject: string;
  message: string;
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: 'config' }
  | { ok: false; reason: 'network' }
  | { ok: false; reason: 'server'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Deliver a message through Web3Forms (https://web3forms.com). */
export async function sendMail(mail: OutgoingMail, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  if (!config.web3formsKey) return { ok: false, reason: 'config' };
  let response: Response;
  try {
    response = await fetchImpl('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: config.web3formsKey,
        subject: mail.subject,
        from_name: `${config.brand.bold} ${config.brand.light}`,
        name: mail.name || mail.email,
        email: mail.email,
        message: mail.message,
        botcheck: '',
      }),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }
  let data: { success?: boolean; message?: string } = {};
  try {
    data = await response.json();
  } catch {
    /* non-JSON error page */
  }
  if (response.ok && data.success !== false) return { ok: true };
  return { ok: false, reason: 'server', message: data.message || `HTTP ${response.status}` };
}
