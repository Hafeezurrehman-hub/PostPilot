import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Prevent duplicate pending requests
    const { data: existing } = await supabase
      .from('account_deletion_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Deletion request already pending', id: existing.id });
    }

    const { data, error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        user_email: user.email,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: 'Deletion request submitted', id: data.id });
  } catch (err) {
    console.error('Account deletion request error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
