/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(request: Request, props: { params: Promise<{ automationId: string }> }) {
    try {
        const { automationId } = await props.params;
        const body = await request.json();
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookies: {
                    get(_name: string) { return cookieStore.get(_name)?.value; },
                    set(_name: string, _value: string, _options: CookieOptions) {},
                    remove(_name: string, _options: CookieOptions) {}
                }
            }
        );

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
        }

        const { data: automation, error } = await supabase
            .from('automation_definitions')
            .update(body)
            .eq('id', automationId)
            .eq('user_id', session.user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(automation);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
