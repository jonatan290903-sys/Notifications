import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import UsuariosClient from './UsuariosClient';

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.es_admin) redirect('/dashboard');

  const { data: usuarios } = await supabase.from('profiles').select('*').order('nombre');
  return <UsuariosClient usuarios={usuarios ?? []} currentUserId={user.id} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL} supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY} />;
}
