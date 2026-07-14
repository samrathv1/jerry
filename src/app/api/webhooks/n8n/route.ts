/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { WebhookService } from '@/domain/automations/webhook-service';
import { z } from 'zod';

const WebhookPayloadSchema = z.object({
    automationType: z.string(),
    payload: z.record(z.any()).optional().default({})
});

export async function POST(request: Request) {
    try {
        const signature = request.headers.get('x-n8n-signature');
        const timestamp = request.headers.get('x-n8n-timestamp');
        const idempotencyKey = request.headers.get('x-n8n-idempotency-key');
        const credentialId = request.headers.get('x-jerry-credential-id');
        
        if (!signature || !timestamp || !idempotencyKey || !credentialId) {
            return NextResponse.json({ error: 'Missing required headers' }, { status: 401 });
        }

        const rawBody = await request.text();
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const parseResult = WebhookPayloadSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid payload schema', details: parseResult.error.format() }, { status: 400 });
        }

        const { automationType } = parseResult.data;

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(_name: string) { return undefined; },
                    set(_name: string, _value: string, _options: CookieOptions) {},
                    remove(_name: string, _options: CookieOptions) {}
                }
            }
        );

        // Fetch credentials using the credentialId header, not the user payload
        const { data: credentials, error: credError } = await supabase
            .from('webhook_credentials')
            .select('user_id, secret_key')
            .eq('id', credentialId)
            .single();

        if (credError || !credentials) {
            return NextResponse.json({ error: 'Webhook credentials not found or invalid' }, { status: 401 });
        }

        const url = new URL(request.url);
        const method = request.method;
        const path = url.pathname;

        const isValid = WebhookService.verifySignature(
            method,
            path,
            timestamp,
            idempotencyKey,
            rawBody,
            credentials.secret_key,
            signature
        );
        
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature or expired timestamp' }, { status: 401 });
        }

        // 1. Verify the automation definition exists and is enabled for the resolved owner
        const { data: definition, error: defError } = await supabase
            .from('automation_definitions')
            .select('*')
            .eq('user_id', credentials.user_id)
            .eq('type', automationType)
            .eq('enabled', true)
            .single();

        if (defError || !definition) {
            return NextResponse.json({ error: 'Automation not found or disabled' }, { status: 404 });
        }

        // 2. Insert automation_run to prevent duplicates using the provided idempotency key
        const { error: runError } = await supabase
            .from('automation_runs')
            .insert({
                definition_id: definition.id,
                user_id: credentials.user_id,
                idempotency_key: idempotencyKey,
                status: 'completed'
            });

        if (runError) {
            if (runError.code === '23505') { 
                return NextResponse.json({ error: 'Duplicate automation run' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Return successfully, no secrets leaked
        return NextResponse.json({ success: true, message: 'Automation triggered successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
