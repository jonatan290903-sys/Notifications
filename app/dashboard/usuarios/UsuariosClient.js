'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function UsuariosClient({ usuarios: initial, currentUserId, supabaseUrl, supabaseKey }) {
  const router  = useRouter();
  const sb = () => createBrowserClient(supabaseUrl, supabaseKey);

  const [usuarios, setUsuarios] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [esAdmin,  setEsAdmin]  = useState(false);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const openModal = () => { setNombre(''); setEmail(''); setPassword(''); setEsAdmin(false); setError(''); setShowModal(true); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password.trim()) return setError('Todos los campos son obligatorios');
    setSaving(true);
    setError('');
    const supabase = sb();

    // Use admin invite (requires service role) or signUp
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { nombre: nombre.trim(), es_admin: esAdmin } },
    });

    if (signUpError) { setError(signUpError.message); setSaving(false); return; }

    // Update profile es_admin if needed
    if (esAdmin && data.user) {
      await supabase.from('profiles').update({ es_admin: true }).eq('id', data.user.id);
    }

    setShowModal(false);
    router.refresh();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (id === currentUserId) return alert('No puedes eliminarte a ti mismo');
    if (!confirm('¿Eliminar este usuario?')) return;
    const supabase = sb();
    await supabase.from('profiles').delete().eq('id', id);
    setUsuarios((p) => p.filter((u) => u.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-400 text-sm mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Agregar usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Nombre</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Rol</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${u.es_admin ? 'bg-purple-500' : 'bg-brand-600'}`}>
                      {u.nombre?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.nombre}</span>
                    {u.id === currentUserId && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Tú</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500">{u.email ?? '—'}</td>
                <td className="px-5 py-3">
                  {u.es_admin
                    ? <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Admin</span>
                    : <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Usuario</span>
                  }
                </td>
                <td className="px-5 py-3 text-right">
                  {u.id !== currentUserId && (
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Agregar usuario</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.com" required />
              </div>
              <div>
                <label className="label">Contraseña *</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" required />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={esAdmin} onChange={(e) => setEsAdmin(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                <span className="text-sm text-gray-700 font-medium">Administrador</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creando...' : 'Crear usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
