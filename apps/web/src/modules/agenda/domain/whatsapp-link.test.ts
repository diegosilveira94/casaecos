import { describe, expect, it } from 'vitest';

import { splitWhatsAppBold, toWhatsAppNumber, whatsAppLink } from './whatsapp-link.js';

describe('toWhatsAppNumber', () => {
  it.each([
    ['(47) 99734-5521', '5547997345521'],
    ['47 3333-4444', '554733334444'],
    ['47997345521', '5547997345521'],
    ['+55 47 99734-5521', '5547997345521'],
    ['047 99734-5521', '5547997345521'],
    ['554733334444', '554733334444'],
  ])('converte %s', (phone, expected) => {
    expect(toWhatsAppNumber(phone)).toBe(expected);
  });

  it.each([[null], [''], ['1234'], ['99734-5521'], ['+1 202 555 0147 99']])(
    'recusa %s',
    (phone) => {
      expect(toWhatsAppNumber(phone)).toBeNull();
    },
  );
});

describe('whatsAppLink', () => {
  it('codifica o texto e aponta para o número', () => {
    expect(whatsAppLink('Olá, *João*\nÀs 08:30', '5547997345521')).toBe(
      'https://api.whatsapp.com/send?phone=5547997345521&text=Ol%C3%A1%2C%20*Jo%C3%A3o*%0A%C3%80s%2008%3A30',
    );
  });

  it('mantém os emojis codificados, sem passar pelo redirecionamento do wa.me', () => {
    expect(whatsAppLink('🔴 ➡️ 📍')).toBe(
      'https://api.whatsapp.com/send?text=%F0%9F%94%B4%20%E2%9E%A1%EF%B8%8F%20%F0%9F%93%8D',
    );
  });

  it('sem número deixa o WhatsApp perguntar a conversa', () => {
    expect(whatsAppLink('Oi')).toBe('https://api.whatsapp.com/send?text=Oi');
  });
});

describe('splitWhatsAppBold', () => {
  it('separa o negrito e mantém o marcador de lista', () => {
    expect(splitWhatsAppBold('Boa tarde! *AGENDA*\n* Escola: BIA')).toEqual([
      { text: 'Boa tarde! ', isBold: false },
      { text: 'AGENDA', isBold: true },
      { text: '\n* Escola: BIA', isBold: false },
    ]);
  });

  it('reconhece negrito no início da linha', () => {
    expect(splitWhatsAppBold('*MOTORISTAS*\nfim')).toEqual([
      { text: 'MOTORISTAS', isBold: true },
      { text: '\nfim', isBold: false },
    ]);
  });
});
