import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName, inviteCode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID mancante' }, { status: 400 });
    }

    const supabase = getAdminClient();

    if (inviteCode && String(inviteCode).trim()) {
      // Cerca coppia per codice invito
      const { data: couple, error: coupleFindError } = await supabase
        .from('couples')
        .select('id')
        .eq('api_key_webhook', String(inviteCode).trim())
        .maybeSingle();

      if (coupleFindError || !couple) {
        return NextResponse.json({ error: 'Codice invito partner non valido' }, { status: 404 });
      }

      const { error: memberError } = await supabase.from('couple_members').insert({
        couple_id: couple.id,
        user_id: userId,
        display_name: displayName || 'Partner',
        role: 'member',
      });

      if (memberError) {
        return NextResponse.json({ error: 'Errore associazione alla coppia: ' + memberError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, coupleId: couple.id });
    } else {
      // Crea nuova coppia
      const coupleName = displayName ? `Casa di ${displayName}` : 'La Nostra Famiglia';
      const { data: newCouple, error: coupleError } = await supabase
        .from('couples')
        .insert({ name: coupleName })
        .select('id')
        .single();

      if (coupleError || !newCouple) {
        return NextResponse.json({ error: 'Errore creazione coppia: ' + (coupleError?.message || 'sconosciuto') }, { status: 500 });
      }

      const { error: memberError } = await supabase.from('couple_members').insert({
        couple_id: newCouple.id,
        user_id: userId,
        display_name: displayName || 'Utente',
        role: 'owner',
      });

      if (memberError) {
        return NextResponse.json({ error: 'Errore creazione membro: ' + memberError.message }, { status: 500 });
      }

      // Inizializza impostazioni fondo emergenza
      await supabase.from('emergency_fund_settings').upsert({
        couple_id: newCouple.id,
        target_months: 6,
      }, { onConflict: 'couple_id' });

      return NextResponse.json({ success: true, coupleId: newCouple.id });
    }
  } catch (err: any) {
    console.error('Setup couple error:', err);
    return NextResponse.json({ error: err?.message || 'Errore server interno' }, { status: 500 });
  }
}
