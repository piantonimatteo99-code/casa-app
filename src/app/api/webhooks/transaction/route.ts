import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { WebhookTransactionPayload } from '@/types';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const authHeader = request.headers.get('Authorization') ?? '';
    const apiKey =
      authHeader.replace('Bearer ', '').trim() ||
      (request.nextUrl.searchParams.get('api_key') ?? '');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id')
      .eq('api_key_webhook', apiKey)
      .single();

    if (coupleError || !couple) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    let payload: WebhookTransactionPayload;
    const contentType = request.headers.get('Content-Type') ?? '';

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = {
        amount: parseFloat((formData.get('amount') as string) ?? '0'),
        merchant: (formData.get('merchant') as string) ?? undefined,
        description: (formData.get('description') as string) ?? undefined,
        date: (formData.get('date') as string) ?? undefined,
        currency: (formData.get('currency') as string) ?? 'EUR',
      };
    } else {
      const text = await request.text();
      payload = parseTextPayload(text);
    }

    const amount = parseFloat(String(payload.amount ?? 0));
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const { data: ownerMember } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', couple.id)
      .eq('role', 'owner')
      .single();

    if (!ownerMember) {
      return NextResponse.json({ error: 'Couple owner not found' }, { status: 500 });
    }

    const { data: defaultCategory } = await supabase
      .from('expense_categories')
      .select('id')
      .is('couple_id', null)
      .eq('name', 'Altro')
      .single();

    const expenseDate = payload.date ?? new Date().toISOString().split('T')[0];

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        couple_id: couple.id,
        user_id: ownerMember.user_id,
        amount,
        merchant: payload.merchant ?? null,
        description: payload.description ?? payload.raw ?? null,
        date: expenseDate,
        is_draft: true,
        category_id: defaultCategory?.id ?? null,
        webhook_payload: payload as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Error creating draft expense:', expenseError);
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        expense_id: expense.id,
        message: `Draft expense created: ${formatCurrencySimple(amount)} at ${payload.merchant ?? 'unknown'}`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function parseTextPayload(text: string): WebhookTransactionPayload {
  const amountMatch = text.match(/(\d+[.,]\d{1,2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
  const merchant = text.replace(amountMatch?.[0] ?? '', '').replace(/EUR|\$/gi, '').trim();
  return { amount, merchant: merchant || undefined, raw: text };
}

function formatCurrencySimple(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/webhooks/transaction' });
}
