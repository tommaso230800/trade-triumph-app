import { describe, expect, it } from 'vitest';
import { allowedMailboxes, requiredSenderFor } from '../../supabase/functions/send-order-email/senders';

describe('Order email sender choice', () => {
  it('uses the agency mailbox by default for everyone', () => {
    expect(requiredSenderFor('Gabriele')).toBe('agenziamazzigroup@gmail.com');
    expect(requiredSenderFor('tommaso')).toBe('agenziamazzigroup@gmail.com');
  });
  it('lets Tommaso choose his personal mailbox', () => {
    expect(allowedMailboxes('Tommaso').map(m => m.email)).toEqual(['agenziamazzigroup@gmail.com', 'tommasosalti@gmail.com']);
    expect(requiredSenderFor('Tommaso', 'personale')).toBe('tommasosalti@gmail.com');
  });
  it('refuses the personal mailbox to other members', () => {
    expect(requiredSenderFor('Andrea', 'personale')).toBeNull();
    expect(requiredSenderFor('Gabriele', 'personale')).toBeNull();
    expect(requiredSenderFor(null, 'personale')).toBeNull();
  });
});
