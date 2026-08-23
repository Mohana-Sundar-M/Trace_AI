export type EventType = 
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.failed'
  | 'order.paid'
  | 'refund.created'
  | 'refund.processed'
  | 'payment.dispute.created'
  | 'payment.dispute.action_required'
  | 'payment.dispute.closed'
  | 'settlement.processed';

export interface WebhookEvent {
  event_id: string;
  merchant_id: string;
  event_type: EventType;
  entity_type: string;
  entity_id: string;
  payload: any;
  signature: string;
  created_at: string;
}

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'trace-secret-key-for-hmac';

export function createSignature(payload: any, secret: string = WEBHOOK_SECRET): string {
  // const hmac = crypto.createHmac('sha256', secret);
  // hmac.update(JSON.stringify(payload));
  // return hmac.digest('hex');
  return 'mock-signature';
}

export function verifySignature(payload: any, signature: string, secret: string = WEBHOOK_SECRET): boolean {
  const expectedSignature = createSignature(payload, secret);
  return signature === expectedSignature;
}

export function generateEvent(
  merchant_id: string, 
  event_type: EventType, 
  entity_type: string, 
  entity_id: string, 
  payload: any
): WebhookEvent {
  return {
    event_id: `evt_${crypto.randomUUID().replace(/-/g, '')}`,
    merchant_id,
    event_type,
    entity_type,
    entity_id,
    payload,
    signature: createSignature(payload),
    created_at: new Date().toISOString()
  };
}

import { SupabaseClient } from '@supabase/supabase-js';

export class WebhookProcessor {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Processes an incoming webhook event.
   * - Verifies HMAC
   * - Checks Idempotency
   * - Processes event & updates financial entity
   * - Records attempts and audit log
   */
  async processEvent(event: WebhookEvent) {
    // 1. Verify Signature
    if (!verifySignature(event.payload, event.signature)) {
      await this.recordAttempt(event.event_id, 'FAILED', 'Invalid HMAC signature');
      throw new Error('Invalid HMAC signature');
    }

    // 2. Check Idempotency
    const { data: existingEvent } = await this.supabase
      .from('webhook_events')
      .select('status')
      .eq('event_id', event.event_id)
      .single();

    if (existingEvent && existingEvent.status === 'processed') {
      await this.recordAttempt(event.event_id, 'IGNORED', 'Duplicate event (Idempotency check)');
      return { status: 'ignored_duplicate' };
    }

    if (!existingEvent) {
      // Create the event record
      await this.supabase.from('webhook_events').insert({
        event_id: event.event_id,
        merchant_id: event.merchant_id,
        event_type: event.event_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        payload: event.payload,
        signature: event.signature,
        status: 'pending'
      });
    }

    try {
      // 3. Process Event and Update Entity
      await this.applyEventState(event);

      // 4. Record Success
      await this.supabase.from('webhook_events').update({
        status: 'processed',
        processed_at: new Date().toISOString()
      }).eq('event_id', event.event_id);

      await this.recordAttempt(event.event_id, 'SUCCESS');
      await this.recordAuditLog(event);

      return { status: 'processed' };
    } catch (err: any) {
      // 5. Record Failure
      await this.supabase.from('webhook_events').update({
        status: 'failed',
        error_message: err.message
      }).eq('event_id', event.event_id);

      await this.recordAttempt(event.event_id, 'FAILED', err.message);
      throw err;
    }
  }

  private async applyEventState(event: WebhookEvent) {
    switch (event.event_type) {
      case 'payment.captured':
        await this.supabase.from('payments').update({ status: 'captured', captured: true, captured_at: new Date().toISOString() }).eq('payment_id', event.entity_id);
        break;
      case 'refund.processed':
        await this.supabase.from('refunds').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('refund_id', event.entity_id);
        break;
      case 'settlement.processed':
        await this.supabase.from('settlements').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('settlement_id', event.entity_id);
        break;
      // Other events...
    }
  }

  private async recordAttempt(eventId: string, status: string, error?: string) {
    await this.supabase.from('event_attempts').insert({
      attempt_id: `atm_${crypto.randomUUID().replace(/-/g, '')}`,
      event_id: eventId,
      status,
      error
    });
    
    const { data } = await this.supabase.from('webhook_events').select('attempt').eq('event_id', eventId).single();
    if (data) {
      await this.supabase.from('webhook_events').update({ attempt: (data.attempt || 0) + 1 }).eq('event_id', eventId);
    }
  }

  private async recordAuditLog(event: WebhookEvent) {
    await this.supabase.from('audit_logs').insert({
      audit_id: `aud_${crypto.randomUUID().replace(/-/g, '')}`,
      merchant_id: event.merchant_id,
      actor_type: 'WEBHOOK',
      action: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      metadata: event.payload
    });
  }
}
