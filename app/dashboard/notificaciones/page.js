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
  const [expandedId, setExpandedId] = useState(null);

  // Form
  const [titulo,     setTitulo]     = useState('');
  const [mensaje,    setMensaje]    = useState('');
  const [todos,      setTodos]      = useState(true);
  const [selUsuarios, setSelUsuarios] = useState([]);
  const [expiraDias, setExpiraDias] = useState(0); // 0 = sin expiración

  // Data
  const [usuarios,   setUsuarios]   = useState([]);
  const [historial,  setHistorial]  = useState([]);
  const [me,         setMe]         = useState(null);

  const loadHistory = async () => {
    const { data: hist } = await sb.from('notificaciones_push')
      .select('*, enviador:profiles!enviado_por(nombre), destinatarios:notificacion_push_usuarios(usuario_id, leida, confirmada, confirmada_at, profile:profiles(id,nombre))')
      .order('created_at', { ascending: false }).limit(50);
    setHistorial((hist ?? []).map(h => ({
      ...h,
      enviador: h.enviador,
      destinatarios: h.destinatarios?.map(d => ({
        ...d.profile,
        leida: d.leida,
        confirmada: d.confirmada,
        confirmada_at: d.confirmada_at,
      })).filter(d => d.id) ?? [],
    })));
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      setMe(user);
      const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
      if (!prof?.es_admin) { router.replace('/dashboard'); return; }
      setIsAdmin(true);

      const { data: usrs } = await sb.from('profiles').select('*').order('nombre');
      setUsuarios(usrs ?? []);
      await loadHistory();
      setLoading(false);
    })();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) return setError('Completa el titulo y mensaje');
    if (!todos && selUsuarios.length === 0) return setError('Selecciona al menos un usuario');
    setSending(true); setError(''); setSuccess('');

    try {
      const expiraAt = expiraDias > 0 ? new Date(Date.now() + expiraDias * 86400000).toISOString() : null;
      const { data: notif, error: err } = await sb
        .from('notificaciones_push')
        .insert({ titulo: titulo.trim(), mensaje: mensaje.trim(), enviado_por: me.id, todos_usuarios: todos, expira_at: expiraAt })
        .select().single();

      if (err) throw new Error(err.message);

      const targetIds = (todos ? usuarios.map(u => u.id) : selUsuarios).filter(uid => uid !== me.id);
      if (targetIds.length > 0) {
        await sb.from('notificacion_push_usuarios').insert(
          targetIds.map(uid => ({ notificacion_id: notif.id, usuario_id: uid }))
        );
      }

      setSuccess(`Notificacion enviada a ${targetIds.length} usuario${targetIds.length !== 1 ? 's' : ''}`);
      setTitulo(''); setMensaje(''); setTodos(true); setSelUsuarios([]); setExpiraDias(0);
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const deleteNotif = async (id) => {
    if (!confirm('¿Eliminar esta notificación? Se eliminará para todos los usuarios.')) return;
    await sb.from('notificacion_push_usuarios').delete().eq('notificacion_id', id);
    await sb.from('notificaciones_push').delete().eq('id', id);
    setHistorial(prev => prev.filter(n => n.id !== id));
  };

  const toggleUsuario = (id) => setSelUsuarios(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs/24)}d`;
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 spinner"/></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notificaciones</h1>
          <p className="page-sub">Envia notificaciones y revisa quien las confirmo</p>
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
            <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Reunion de equipo, Aviso importante..." required />
          </div>
          <div className="input-group">
            <label className="label">Mensaje *</label>
            <textarea className="input" rows={3} value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Escribe el contenido de la notificacion..." required style={{ resize: 'vertical' }} />
          </div>

          {/* Target selection */}
          <div>
            <label className="label mb-2">Destinatarios</label>
            <div className="flex gap-3 mb-3">
              <button type="button" onClick={() => { setTodos(true); setSelUsuarios([]); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${todos ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Todos los usuarios
              </button>
              <button type="button" onClick={() => setTodos(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${!todos ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                Seleccionar usuarios
              </button>
            </div>
            {!todos && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-3 font-medium">Selecciona los usuarios:</p>
                <div className="flex flex-wrap gap-2">
                  {usuarios.map(u => (
                    <button key={u.id} type="button" onClick={() => toggleUsuario(u.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${selUsuarios.includes(u.id) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${selUsuarios.includes(u.id) ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{u.nombre?.charAt(0)?.toUpperCase()}</div>
                      {u.nombre}
                      {selUsuarios.includes(u.id) && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expiration */}
          <div>
            <label className="label mb-2">Tiempo de vida (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: 0, l: 'Sin limite' },
                { v: 1, l: '1 dia' },
                { v: 3, l: '3 dias' },
                { v: 7, l: '1 semana' },
                { v: 30, l: '1 mes' },
              ].map(opt => (
                <button key={opt.v} type="button" onClick={() => setExpiraDias(opt.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                    expiraDias === opt.v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
            {expiraDias > 0 && <p className="text-xs text-gray-400 mt-1">La notificacion se desactivara automaticamente despues de {expiraDias} dia{expiraDias !== 1 ? 's' : ''}</p>}
          </div>

          <button type="submit" disabled={sending} className="btn-primary">
            {sending
              ? <><div className="w-4 h-4 spinner mr-2"/> Enviando...</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg> Enviar notificacion</>
            }
          </button>
        </form>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Historial
          </h2>
          <button onClick={loadHistory} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Actualizar
          </button>
        </div>

        {historial.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold">Sin notificaciones enviadas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map(n => {
              const totalDest = n.destinatarios.length;
              const confirmed = n.destinatarios.filter(d => d.confirmada).length;
              const read = n.destinatarios.filter(d => d.leida).length;
              const isExpanded = expandedId === n.id;
              const isExpired = n.expira_at && new Date(n.expira_at) < new Date();

              return (
                <div key={n.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${isExpired ? 'border-orange-200 opacity-60' : 'border-gray-100'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className={`font-semibold ${isExpired ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{n.titulo}</h3>
                          {n.todos_usuarios
                            ? <span className="badge badge-blue">Todos</span>
                            : <span className="badge badge-gray">{totalDest} usuario{totalDest !== 1 ? 's' : ''}</span>
                          }
                          {isExpired && <span className="badge badge-orange">Expirada</span>}
                          {n.expira_at && !isExpired && (
                            <span className="badge badge-yellow">Expira {new Date(n.expira_at).toLocaleDateString('es-BO')}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{n.mensaje}</p>

                        {/* Confirmation stats */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                              {n.enviador?.nombre ?? 'Admin'}
                            </span>
                            <span>{new Date(n.created_at).toLocaleString('es-BO')}</span>
                          </div>

                          {totalDest > 0 && (
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${confirmed === totalDest ? 'bg-green-50 text-green-700' : confirmed > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'}`}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                {confirmed}/{totalDest} confirmaron
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                {read}/{totalDest} leyeron
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {totalDest > 0 && (
                          <button onClick={() => setExpandedId(isExpanded ? null : n.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isExpanded ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            Detalle
                            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                          </button>
                        )}
                        <button onClick={() => deleteNotif(n.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                          title="Eliminar notificacion">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {n.destinatarios.map(u => (
                          <div key={u.id} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-3 py-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${u.confirmada ? 'bg-green-500' : u.leida ? 'bg-blue-500' : 'bg-gray-300'}`}>
                              {u.nombre?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{u.nombre}</p>
                              <p className="text-xs text-gray-400">
                                {u.confirmada
                                  ? `Confirmada hace ${timeAgo(u.confirmada_at)}`
                                  : u.leida ? 'Leida, sin confirmar' : 'No leida'
                                }
                              </p>
                            </div>
                            <div className="shrink-0">
                              {u.confirmada ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                  Confirmada
                                </span>
                              ) : u.leida ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                  Leida
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
