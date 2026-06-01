'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

export default function UsuariosPage() {
  const router   = useRouter();
  const [usuarios,  setUsuarios]  = useState([]);
  const [me,        setMe]        = useState(null);
  const [isAdmin,   setIsAdmin]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nombre,    setNombre]    = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [esAdmin,   setEsAdmin]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const sb = createClient();

  const load = async () => {
    const { data: { user } } = await sb.auth.getUser();
    setMe(user);
    const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (!prof?.es_admin) { router.replace('/dashboard'); return; }
    setIsAdmin(true);
    const { data } = await sb.from('profiles').select('*').order('nombre');
    setUsuarios(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || password.length < 6) return setError('Completa todos los campos (mínimo 6 caracteres para contraseña)');
    setSaving(true); setError('');
    const { data, error: err } = await sb.auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: { data: { nombre: nombre.trim(), es_admin: esAdmin } },
    });
    if (err) { setError(err.message); setSaving(false); return; }
    // Auto-confirm via admin update (service role not available client-side, so just note)
    if (data?.user) {
      await sb.from('profiles').upsert({ id: data.user.id, nombre: nombre.trim(), es_admin: esAdmin });
    }
    setShowModal(false); setNombre(''); setEmail(''); setPassword(''); setEsAdmin(false);
    await load();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (id === me?.id || !confirm('¿Eliminar este usuario?')) return;
    await sb.from('profiles').delete().eq('id', id);
    setUsuarios((p) => p.filter((u) => u.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 spinner" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-sub">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Agregar usuario
        </button>
      </div>

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="table-head"><tr>
            <th className="th">Usuario</th>
            <th className="th">Email</th>
            <th className="th">Rol</th>
            <th className="th">Registrado</th>
            <th className="th" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${u.es_admin ? 'bg-purple-500' : 'bg-blue-600'}`}>
                      {u.nombre?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-900">{u.nombre}</span>
                    {u.id === me?.id && <span className="badge badge-blue">Tú</span>}
                  </div>
                </td>
                <td className="td text-gray-500">{u.email ?? '—'}</td>
                <td className="td">{u.es_admin ? <span className="badge" style={{backgroundColor:'#f5f3ff',color:'#7c3aed'}}>Admin</span> : <span className="badge badge-gray">Usuario</span>}</td>
                <td className="td text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('es-BO')}</td>
                <td className="td text-right">
                  {u.id !== me?.id && (
                    <button onClick={() => handleDelete(u.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Agregar usuario</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="input-group"><label className="label">Nombre *</label><input className="input" value={nombre} onChange={(e)=>setNombre(e.target.value)} placeholder="Nombre completo" required/></div>
              <div className="input-group"><label className="label">Email *</label><input type="email" className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="correo@empresa.com" required/></div>
              <div className="input-group"><label className="label">Contraseña * (mín. 6 chars)</label><input type="password" className="input" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••" required/></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={esAdmin} onChange={(e)=>setEsAdmin(e.target.checked)} className="w-4 h-4 accent-purple-600"/>
                <span className="text-sm text-gray-700 font-medium">Administrador</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Creando...':'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
