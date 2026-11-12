// Delivery outcome rules for Web Push responses (pure, shared with app tests).
export function retryDelayMinutes(attempts: number): number {
  return Math.min(60, Math.max(1, attempts * attempts));
}

/** Classifies a push-service response: accepted, expired subscription, retryable or permanent failure. */
export function classifyPushStatus(status: number): 'accettata' | 'scaduta' | 'riprova' | 'fallita' {
  if (status >= 200 && status < 300) return 'accettata';
  if (status === 404 || status === 410) return 'scaduta';
  if (status === 429 || status >= 500) return 'riprova';
  return 'fallita';
}

