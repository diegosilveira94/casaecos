const BRAZIL_COUNTRY_CODE = '55';
const WHATSAPP_SEND_URL = 'https://api.whatsapp.com/send';

/**
 * The digits WhatsApp expects, with the country code. `person.phone` is free text, so
 * this is where "(47) 99734-5521" becomes a number; null when it cannot be a Brazilian one.
 */
export function toWhatsAppNumber(phone: string | null): string | null {
  if (phone === null) return null;

  const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) return `${BRAZIL_COUNTRY_CODE}${digits}`;
  const hasCountryCode = digits.length === 12 || digits.length === 13;
  return hasCountryCode && digits.startsWith(BRAZIL_COUNTRY_CODE) ? digits : null;
}

/**
 * Without a number, WhatsApp asks which chat or group gets the text. Not `wa.me`: its
 * redirect to this same address replaces every emoji in the text with "�".
 */
export function whatsAppLink(text: string, whatsAppNumber: string | null = null): string {
  const phone = whatsAppNumber === null ? '' : `phone=${whatsAppNumber}&`;
  return `${WHATSAPP_SEND_URL}?${phone}text=${encodeURIComponent(text)}`;
}

export interface WhatsAppTextSegment {
  text: string;
  isBold: boolean;
}

/** Splits on WhatsApp's `*bold*`, for the preview. A `* ` at the start of a line stays a bullet. */
export function splitWhatsAppBold(text: string): WhatsAppTextSegment[] {
  const segments: WhatsAppTextSegment[] = [];
  let position = 0;

  for (const match of text.matchAll(/(^|\s)\*(\S(?:[^*\n]*\S)?)\*/gm)) {
    const [whole, before = '', boldText = ''] = match;
    const boldStart = match.index + before.length;
    if (boldStart > position) {
      segments.push({ text: text.slice(position, boldStart), isBold: false });
    }
    segments.push({ text: boldText, isBold: true });
    position = match.index + whole.length;
  }

  if (position < text.length) segments.push({ text: text.slice(position), isBold: false });
  return segments;
}
