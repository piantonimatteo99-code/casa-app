import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient(preferServiceRole = true) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  // Se preferServiceRole è true e c'è una service key valida (non placeholder), usala; altrimenti anonKey
  const key = preferServiceRole && serviceKey && !serviceKey.includes('placeholder')
    ? serviceKey
    : anonKey;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName, inviteCode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID mancante' }, { status: 400 });
    }

    // Prova prima con Service Role, se fallisce per API key errata riprova con Anon Key
    let supabase = getSupabaseClient(true);

    if (inviteCode && String(inviteCode).trim()) {
      let { data: couple, error: coupleFindError } = await supabase
        .from('couples')
        .select('id')
        .eq('api_key_webhook', String(inviteCode).trim())
        .maybeSingle();

      if (coupleFindError && coupleFindError.message?.includes('API key')) {
        supabase = getSupabaseClient(false);
        const retry = await supabase
          .from('couples')
          .select('id')
          .eq('api_key_webhook', String(inviteCode).trim())
          .maybeSingle();
        couple = retry.data;
        coupleFindError = retry.error;
      }

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
        return NextResponse.json({ error: 'Errore associazione partner: ' + memberError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, coupleId: couple.id });
    } else {
      // Genera l'UUID della coppia direttamente per evitare SELECT bloccate da RLS
      const coupleId = crypto.randomUUID();
      const coupleName = displayName ? `Casa di ${displayName}` : 'La Nostra Famiglia';

      let { error: coupleInsertError } = await supabase
        .from('couples')
        .insert({
          id: coupleId,
          name: coupleName,
        });

      // Se la service role key salvata su Vercel è invalida, riprova immediatamente con la anon key!
      if (coupleInsertError && coupleInsertError.message?.includes('API key')) {
        supabase = getSupabaseClient(false);
        const retry = await supabase
          .from('couples')
          .insert({
            id: coupleId,
            name: coupleName,
          });
        coupleInsertError = retry.error;
      }

      if (coupleInsertError) {
        return NextResponse.json({
          error: 'Errore creazione coppia: ' + coupleInsertError.message
        }, { status: 500 });
      }

      // Inserisci il membro (owner)
      const { error: memberError } = await supabase.from('couple_members').insert({
        couple_id: coupleId,
        user_id: userId,
        display_name: displayName || 'Utente',
        role: 'owner',
      });

      if (memberError) {
        return NextResponse.json({ error: 'Errore creazione membro: ' + memberError.message }, { status: 500 });
      }

      // Inizializza fondo emergenza default
      await supabase.from('emergency_fund_settings').upsert({
        couple_id: coupleId,
        target_months: 6,
      }, { onConflict: 'couple_id' });

      return NextResponse.json({ success: true, coupleId });
    }
  } catch (err: any) {
    console.error('Setup couple exception:', err);
    return NextResponse.json({ error: err?.message || 'Errore server interno' }, { status: 500 });
  }
}
