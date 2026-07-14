import { describe, it, expect } from 'vitest';
import { WebhookService } from './webhook-service';
import fs from 'fs';
import path from 'path';

describe('WebhookService - HMAC Verification', () => {
    const method = 'POST';
    const requestPath = '/api/webhooks/n8n';
    const secret = 'super-secret-key-xyz';
    
    it('generates and verifies a valid runtime-generated signature', () => {
        const payload = JSON.stringify({ automationType: 'daily_briefing', payload: {} });
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const idempotencyKey = 'idemp-123';
        
        const signature = WebhookService.generateSignature(method, requestPath, timestamp, idempotencyKey, payload, secret);
        const isValid = WebhookService.verifySignature(method, requestPath, timestamp, idempotencyKey, payload, secret, signature);
        
        expect(isValid).toBe(true);
    });

    it('rejects if body is changed after signing', () => {
        const originalPayload = JSON.stringify({ automationType: 'daily_briefing', payload: {} });
        const modifiedPayload = JSON.stringify({ automationType: 'daily_briefing', payload: { hacked: true } });
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const idempotencyKey = 'idemp-123';
        
        const signature = WebhookService.generateSignature(method, requestPath, timestamp, idempotencyKey, originalPayload, secret);
        const isValid = WebhookService.verifySignature(method, requestPath, timestamp, idempotencyKey, modifiedPayload, secret, signature);
        
        expect(isValid).toBe(false);
    });

    it('rejects if JSON key order is different (exact body serialization matters)', () => {
        const originalPayload = JSON.stringify({ automationType: 'daily_briefing', payload: {} });
        const reorderedPayload = JSON.stringify({ payload: {}, automationType: 'daily_briefing' });
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const idempotencyKey = 'idemp-123';
        
        const signature = WebhookService.generateSignature(method, requestPath, timestamp, idempotencyKey, originalPayload, secret);
        const isValid = WebhookService.verifySignature(method, requestPath, timestamp, idempotencyKey, reorderedPayload, secret, signature);
        
        expect(isValid).toBe(false);
    });

    it('rejects a wrong request path', () => {
        const payload = JSON.stringify({ automationType: 'daily_briefing', payload: {} });
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const idempotencyKey = 'idemp-123';
        
        const signature = WebhookService.generateSignature(method, '/api/wrong/path', timestamp, idempotencyKey, payload, secret);
        const isValid = WebhookService.verifySignature(method, requestPath, timestamp, idempotencyKey, payload, secret, signature);
        
        expect(isValid).toBe(false);
    });

    it('rejects wrong timestamp units (e.g. milliseconds instead of seconds)', () => {
        const payload = JSON.stringify({ automationType: 'daily_briefing', payload: {} });
        const timestampMs = Date.now().toString();
        const idempotencyKey = 'idemp-123';
        
        const signature = WebhookService.generateSignature(method, requestPath, timestampMs, idempotencyKey, payload, secret);
        const isValid = WebhookService.verifySignature(method, requestPath, timestampMs, idempotencyKey, payload, secret, signature);
        
        // requestTime will be huge, Math.abs(currentTime - requestTime) > 300 will fail it
        expect(isValid).toBe(false);
    });

    it('rejects if idempotency key is tampered/duplicate verification fails', () => {
        const payload = JSON.stringify({ automationType: 'daily_briefing', payload: {} });
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        const signature = WebhookService.generateSignature(method, requestPath, timestamp, 'idemp-123', payload, secret);
        const isValid = WebhookService.verifySignature(method, requestPath, timestamp, 'idemp-tampered', payload, secret, signature);
        
        expect(isValid).toBe(false);
    });
});

describe('n8n exported workflows security scan', () => {
    it('confirms the workflows use a Crypto HMAC node without exposing secrets in code', () => {
        const workflowsDir = path.join(process.cwd(), 'n8n', 'workflows');
        const files = fs.readdirSync(workflowsDir);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
                const workflow = JSON.parse(content);
                
                // Assert no secret value exists in string format
                expect(content).not.toContain('super-secret');
                expect(content).not.toContain('YOUR_SECRET_HERE');
                expect(content).not.toContain('secret = "');
                expect(content).not.toContain("secret = '");

                // Assert no $credentials expression exists (we migrated to Crypto Node)
                expect(content).not.toContain('$credentials.value');
                expect(content).not.toContain('$credentials.');

                // Verify the Crypto HMAC node exists and is configured
                const cryptoNode = workflow.nodes.find((n: any) => n.type === 'n8n-nodes-base.crypto');
                expect(cryptoNode).toBeDefined();
                expect(cryptoNode.parameters.action).toBe('hmac');
                expect(cryptoNode.parameters.type).toBe('SHA256');
                expect(cryptoNode.parameters.encoding).toBe('hex');
                expect(cryptoNode.parameters.value).toBe('={{$json.canonicalString}}');
                
                // Check if it has the credential bound
                expect(cryptoNode.credentials).toBeDefined();

                // Verify rawBody is reused unchanged in HTTP request
                const httpNode = workflow.nodes.find((n: any) => n.type === 'n8n-nodes-base.httpRequest');
                expect(httpNode).toBeDefined();
                expect(httpNode.parameters.specifyBody).toBe('string');
                expect(httpNode.parameters.bodyString).toBe('={{$json.rawBody}}');
                
                // Verify required headers are configured
                const headers = httpNode.parameters.headerParameters.parameters;
                expect(headers).toContainEqual(expect.objectContaining({ name: 'x-jerry-credential-id' }));
                expect(headers).toContainEqual(expect.objectContaining({ name: 'x-n8n-timestamp', value: '={{$json.timestamp}}' }));
                expect(headers).toContainEqual(expect.objectContaining({ name: 'x-n8n-idempotency-key', value: '={{$json.idempotencyKey}}' }));
                expect(headers).toContainEqual(expect.objectContaining({ name: 'x-n8n-signature', value: '={{$json.signature}}' }));
                expect(headers).toContainEqual(expect.objectContaining({ name: 'Content-Type', value: 'application/json' }));
            }
        }
    });
});
