import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email e nuova password richieste' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La password deve avere almeno 6 caratteri' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Trova l'utente per email tramite Supabase admin API
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json({ error: 'Impossibile accedere alla gestione utenti: ' + listError.message }, { status: 500 });
    }

    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!targetUser) {
      return NextResponse.json({ error: 'Nessun utente trovato con questa email' }, { status: 404 });
    }

    // Aggiorna la password dell'utente con i privilegi admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
      email_confirm: true, // conferma automaticamente l'email
    });

    if (updateError) {
      return NextResponse.json({ error: 'Errore aggiornamento password: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password aggiornata con successo! Ora puoi accedere.',
    });
  } catch (err: any) {
    console.error('Admin reset password error:', err);
    return NextResponse.json({ error: err?.message || 'Errore server interno' }, { status: 500 });
  }
}
