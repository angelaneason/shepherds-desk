import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the user token
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized or expired session' }, { status: 401 });
    }

    // Delete user from auth (cascades to profiles, sermons, events, resources, etc.)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account permanently deleted' });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
