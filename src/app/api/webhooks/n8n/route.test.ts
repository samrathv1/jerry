import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { WebhookService } from '@/domain/automations/webhook-service';

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => ({
        from: vi.fn((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
                if (table === 'webhook_credentials') {
                    // This mock handles missing credential or disabled checks based on headers
                    return Promise.resolve({ data: { user_id: 'user-123', secret_key: 'secret' }, error: null });
                }
                if (table === 'automation_definitions') {
                    return Promise.resolve({ data: { id: 'def-123', user_id: 'user-123', type: 'daily_briefing', enabled: true }, error: null });
                }
                return Promise.resolve({ data: null, error: new Error('Not found') });
            }),
            insert: vi.fn().mockImplementation(() => Promise.resolve({ error: null }))
        }))
    }))
}));

describe('POST /api/webhooks/n8n', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects missing credential ID', async () => {
        const req = new Request('http://localhost:3000/api/webhooks/n8n', {
            method: 'POST',
            headers: {
                'x-n8n-signature': 'abc',
                'x-n8n-timestamp': '1234567890',
                'x-n8n-idempotency-key': 'idemp-123'
                // missing x-jerry-credential-id
            },
            body: JSON.stringify({ automationType: 'daily_briefing' })
        });
        
        const res = await POST(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Missing required headers');
    });

    it('rejects disabled automation or missing credentials from DB', async () => {
        // We override the mock for this specific test
        const { createServerClient } = await import('@supabase/ssr');
        vi.mocked(createServerClient).mockImplementationOnce(() => ({
            from: vi.fn((table: string) => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockImplementation(() => {
                    if (table === 'webhook_credentials') {
                        return Promise.resolve({ data: { user_id: 'user-123', secret_key: 'secret' }, error: null });
                    }
                    if (table === 'automation_definitions') {
                        // Mock disabled automation
                        return Promise.resolve({ data: null, error: { message: 'Not found' } });
                    }
                    return Promise.resolve({ data: null, error: null });
                }),
                insert: vi.fn()
            }))
        }) as any);

        vi.spyOn(WebhookService, 'verifySignature').mockReturnValueOnce(true);

        const req = new Request('http://localhost:3000/api/webhooks/n8n', {
            method: 'POST',
            headers: {
                'x-n8n-signature': 'abc',
                'x-n8n-timestamp': '1234567890',
                'x-n8n-idempotency-key': 'idemp-123',
                'x-jerry-credential-id': 'cred-123'
            },
            body: JSON.stringify({ automationType: 'daily_briefing' })
        });
        
        const res = await POST(req);
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe('Automation not found or disabled');
    });

    it('rejects duplicate idempotency key (duplicate run)', async () => {
        const { createServerClient } = await import('@supabase/ssr');
        vi.mocked(createServerClient).mockImplementationOnce(() => ({
            from: vi.fn((table: string) => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockImplementation(() => {
                    if (table === 'webhook_credentials') return Promise.resolve({ data: { user_id: 'u1', secret_key: 's1' }, error: null });
                    if (table === 'automation_definitions') return Promise.resolve({ data: { id: 'd1' }, error: null });
                    return Promise.resolve({ data: null, error: null });
                }),
                insert: vi.fn().mockImplementation(() => Promise.resolve({ error: { code: '23505' } })) // Postgres unique violation
            }))
        }) as any);

        vi.spyOn(WebhookService, 'verifySignature').mockReturnValueOnce(true);

        const req = new Request('http://localhost:3000/api/webhooks/n8n', {
            method: 'POST',
            headers: {
                'x-n8n-signature': 'abc',
                'x-n8n-timestamp': '1234567890',
                'x-n8n-idempotency-key': 'idemp-123',
                'x-jerry-credential-id': 'cred-123'
            },
            body: JSON.stringify({ automationType: 'daily_briefing' })
        });
        
        const res = await POST(req);
        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.error).toBe('Duplicate automation run');
    });
});
