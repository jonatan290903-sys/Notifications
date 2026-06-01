'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

const nav = [
  { href: '/dashboard',                  icon: HomeIcon,   label: 'Inicio',          color: 'blue' },
  { href: '/dashboard/recordatorios',    icon: BellIcon,   label: 'Recordatorios',   color: 'blue' },
  { href: '/dashboard/notificaciones',   icon: SendIcon,   label: 'Notificaciones',  color: 'blue', adminOnly: true },
  { href: '/dashboard/usuarios',         icon: UsersIcon,  label: 'Usuarios',        color: 'purple', adminOnly: true },
  { href: '/dashboard/etiquetas',        icon: TagIcon,    label: 'Etiquetas',       color: 'emerald' },
];

const colors = {
  blue:    { active: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-500',    icon: 'text-blue-600' },
  purple:  { active: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500', icon: 'text-purple-600' },
  emerald: { active: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: 'text-emerald-600' },
};

export default function Sidebar({ user, profile }) {
  const pathname = usePathname();
  const router   = useRouter();

  const logout = async () => {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <BellIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Recordatorios</p>
            <p className="text-xs text-gray-400 leading-tight">Gestión empresarial</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.filter((n) => !n.adminOnly || profile?.es_admin).map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          const c = colors[color];
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? c.active : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? c.icon : 'text-gray-400'}`} />
              {label}
              {active && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${c.dot}`} />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-2 border-t border-gray-100 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.nombre?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{profile?.nombre}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          {profile?.es_admin && (
            <span className="shrink-0 text-xs bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">Admin</span>
          )}
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <LogoutIcon className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function HomeIcon({ className })   { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>; }
function BellIcon({ className })   { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>; }
function UsersIcon({ className })  { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>; }
function TagIcon({ className })    { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>; }
function SendIcon({ className })   { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>; }
function LogoutIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }
