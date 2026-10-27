import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDER_BODY, DEFAULT_ORDER_SUBJECT, dynamicEmailTemplate, renderEmailTemplate, romeEmailContext, parseEmailAddresses, validEmailAddresses } from './orderEmailTemplates';

describe('Invio ordini Europe/Rome', () => {
  it('alle 14:00 include buongiorno e buona giornata', () => {
    const c = romeEmailContext('Bar Centrale', '', new Date('2026-10-27T13:00:00Z'));
    expect(c.saluto).toBe('Buongiorno'); expect(c.chiusura).toBe('Buona giornata');
  });
  it('alle 14:01 passa a buonasera e buona serata', () => {
    const c = romeEmailContext('', '', new Date('2026-10-27T13:01:00Z'));
    expect(c.saluto).toBe('Buonasera'); expect(c.chiusura).toBe('Buona serata');
  });
  it('alle 06:00 ricomincia il buongiorno', () => {
    expect(romeEmailContext('', '', new Date('2026-10-27T05:00:00Z')).saluto).toBe('Buongiorno');
  });
  it('alle 05:59 è ancora sera', () => {
    expect(romeEmailContext('', '', new Date('2026-10-27T04:59:00Z')).saluto).toBe('Buonasera');
  });
  it('gestisce ora legale in Europe/Rome', () => {
    expect(romeEmailContext('', '', new Date('2026-07-27T12:00:00Z')).saluto).toBe('Buongiorno');
    expect(romeEmailContext('', '', new Date('2026-07-27T12:01:00Z')).saluto).toBe('Buonasera');
  });
  it('oggetto usa cliente e giorno invio italiano, anche dopo mezzanotte locale', () => {
    const c = romeEmailContext('Bar Centrale', '', new Date('2026-10-26T23:30:00Z'));
    expect(renderEmailTemplate(DEFAULT_ORDER_SUBJECT, c)).toBe('Ordine Bar Centrale – 27/10/2026');
  });
  it('testo mantiene spazi tra paragrafi e aggiunge firma', () => {
    const c = romeEmailContext('', 'Firma agenzia', new Date('2026-10-27T09:00:00Z'));
    expect(renderEmailTemplate(DEFAULT_ORDER_BODY, c)).toBe('Buongiorno,\n\nin allegato ordine.\n\nAttendo conferma ordine.\n\nBuona giornata.\n\nFirma agenzia');
  });
  it('salvare predefiniti mantiene nome, data, saluti e firma dinamici', () => {
    const c = romeEmailContext('Bar Centrale', 'Firma', new Date('2026-10-27T09:00:00Z'));
    expect(dynamicEmailTemplate(renderEmailTemplate(DEFAULT_ORDER_SUBJECT, c), c)).toBe(DEFAULT_ORDER_SUBJECT);
    expect(dynamicEmailTemplate(renderEmailTemplate(DEFAULT_ORDER_BODY, c), c)).toBe(DEFAULT_ORDER_BODY);
  });
  it('destinatari multipli senza duplicati e senza header injection', () => {
    expect(parseEmailAddresses('a@example.com; b@example.com, a@example.com')).toEqual(['a@example.com','b@example.com']);
    expect(validEmailAddresses(['a@example.com\r\nBcc:bad@example.com'])).toBe(false);
  });
});