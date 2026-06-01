'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

export default function NotificacionesPage() {
  const router = useRouter();
  const sb = createClient();

  const [isAdmin,    setIsAdmin]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [success,    setSuccess]    = useState('');
  const [error,      setError]     = useState('');

  // Form
  const [titulo,     setTitulo]     = useState('');
  const [mensaje,    setMensaje]    = useState('');
  const [todos,      setTodos]      = useState(true);
  const [selUsuarios, setSelUsuarios] = useState([]);

  // Data
  const [usuarios,   setUsuarios]   = useState([]);
  const [historial,  setHistorial]  = useState([]);
  const [me,         setMe]         = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      setMe(user);
      const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
      if (!prof?.es_admin) { router.replace('/dashboard'); return; }
      setIsAdmin(true);

      const [{ data: usrs }, { data: hist }] = await Promise.all([
        sb.from('profiles').select('*').order('nombre'),
        sb.from('notificaciones_push').select('*, enviador:profiles!enviado_por(nombre), destinatarios:notificacion_push_usuarios(profile:profiles(id,nombre))').order('created_at', { ascending: false }).limit(50),
      ]);
      setUsuarios(usrs ?? []);
      setHistorial((hist ?? []).map(h => ({
        ...h,
        enviador: h.enviador,
        destinatarios: h.destinatarios?.map(d => d.profile).filter(Boolean) ?? [],
      })));
      setLoading(false);
    })();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) return setError('Completa el titulo y mensaje');
    if (!todos && selUsuarios.length === 0) return setError('Selecciona al menos un usuario');
    setSending(true); setError(''); setSuccess('');

    try {
      // Insert notification
      const { data: notif, error: err } = await sb
        .from('notificaciones_push')
        .insert({
          titulo: titulo.trim(),
          mensaje: mensaje.trim(),
          enviado_por: me.id,
          todos_usuarios: todos,
        })
        .select()
        .single();

      if (err) throw new Error(err.message);

      // Insert user targets
      const targetIds = todos
        ? usuarios.map(u => u.id)
        : selUsuarios;

      if (targetIds.length > 0) {
        await sb.from('notificacion_push_usuarios').insert(
          targetIds.map(uid => ({ notificacion_id: notif.id, usuario_id: uid }))
        );
      }

      setSuccess(`Notificacion enviada a ${targetIds.length} usuario${targetIds.length !== 1 ? 's' : ''}`);
      setTitulo(''); setMensaje(''); setTodos(true); setSelUsuarios([]);

      // Refresh history
      const { data: hist } = await sb.from('notificaciones_push')
        .select('*, enviador:profiles!enviado_por(nombre), destinatarios:notificacion_push_usuarios(profile:profiles(id,nombre))')
        .order('created_at', { ascending: false }).limit(50);
      setHistorial((hist ?? []).map(h => ({
        ...h,
        enviador: h.enviador,
        destinatarios: h.destinatarios?.map(d => d.profile).filter(Boolean) ?? [],
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const toggleUsuario = (id) => {
    setSelUsuarios(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 spinner"/></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notificaciones</h1>
          <p className="page-sub">Envia notificaciones personalizadas a los usuarios</p>
        </div>
      </div>

      {/* Send form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          Enviar notificacion
        </h2>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>{success}</div>}

        <form onSubmit={handleSend} className="space-y-4">
          <div className="input-group">
            <label className="label">Titulo *</label>
            <input
              className="input"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej. Reunion de equipo, Aviso importante..."
              required
            />
          </div>

          <div className="input-group">
            <label className="label">Mensaje *</label>
            <textarea
              className="input"
              rows={3}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Escribe el contenido de la notificacion..."
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Target selection */}
          <div>
            <label className="label mb-2">Destinatarios</label>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => { setTodos(true); setSelUsuarios([]); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  todos
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Todos los usuarios
              </button>
              <button
                type="button"
                onClick={() => setTodos(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  !todos
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                Seleccionar usuarios
              </button>
            </div>

            {!todos && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-3 font-medium">Selecciona los usuarios que recibiran la notificacion:</p>
                <div className="flex flex-wrap gap-2">
                  {usuarios.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUsuario(u.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                        selUsuarios.includes(u.id)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        selUsuarios.includes(u.id) ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {u.nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      {u.nombre}
                      {selUsuarios.includes(u.id) && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      )}
                    </button>
                  ))}
                </div>
                {selUsuarios.length > 0 && (
                  <p className="text-xs text-blue-600 font-semibold mt-3">{selUsuarios.length} usuario{selUsuarios.length !== 1 ? 's' : ''} seleccionado{selUsuarios.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={sending}
              className="btn-primary"
            >
              {sending ? (
                <><div className="w-4 h-4 spinner mr-2"/> Enviando...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg> Enviar notificacion</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Historial de notificaciones
        </h2>

        {historial.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold">Sin notificaciones enviadas</p>
            <p className="text-sm mt-1">Las notificaciones que envies apareceran aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map(n => (
              <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{n.titulo}</h3>
                      {n.todos_usuarios
                        ? <span className="badge badge-blue">Todos</span>
                        : <span className="badge badge-gray">{n.destinatarios.length} usuario{n.destinatarios.length !== 1 ? 's' : ''}</span>
                      }
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{n.mensaje}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        {n.enviador?.nombre ?? 'Admin'}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {new Date(n.created_at).toLocaleString('es-BO')}
                      </span>
                    </div>
                    {!n.todos_usuarios && n.destinatarios.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {n.destinatarios.map(u => (
                          <span key={u.id} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 text-xs text-gray-600">
                            <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold" style={{fontSize:'9px'}}>
                              {u.nombre?.charAt(0)?.toUpperCase()}
                            </span>
                            {u.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
