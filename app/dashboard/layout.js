import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import Sidebar from '../../components/Sidebar';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar user={user} profile={profile} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
