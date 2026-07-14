import { createHmac, timingSafeEqual } from 'crypto';

export class WebhookService {
    static generateSignature(
        method: string,
        path: string,
        timestamp: string,
        idempotencyKey: string,
        payload: string,
        secret: string
    ): string {
        const hmac = createHmac('sha256', secret);
        const canonicalString = `${method}\n${path}\n${timestamp}\n${idempotencyKey}\n${payload}`;
        hmac.update(canonicalString);
        return hmac.digest('hex');
    }

    static verifySignature(
        method: string,
        path: string,
        timestamp: string,
        idempotencyKey: string,
        payload: string,
        secret: string,
        signature: string
    ): boolean {
        // Prevent replay attacks by checking timestamp (e.g., within 5 minutes)
        const requestTime = parseInt(timestamp, 10);
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > 300) {
            return false;
        }

        const expectedSignature = this.generateSignature(method, path, timestamp, idempotencyKey, payload, secret);
        
        try {
            return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        } catch {
            return false;
        }
    }
}
