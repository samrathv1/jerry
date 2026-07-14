export type AutomationType = 'daily_briefing' | 'deadline_reminders' | 'weekly_review' | 'gmail_monitor' | 'calendar_monitor';

export interface WebhookCredentials {
    id: string;
    user_id: string;
    secret_key: string;
    created_at: string;
    updated_at: string;
}

export interface AutomationDefinition {
    id: string;
    user_id: string;
    name: string;
    type: AutomationType;
    enabled: boolean;
    schedule: string | null;
    timezone: string;
    config: Record<string, any>;
    last_run: string | null;
    next_run: string | null;
    created_at: string;
    updated_at: string;
}

export interface AutomationRun {
    id: string;
    definition_id: string;
    user_id: string;
    idempotency_key: string;
    status: 'running' | 'completed' | 'failed';
    error: any;
    created_at: string;
    completed_at: string | null;
}
