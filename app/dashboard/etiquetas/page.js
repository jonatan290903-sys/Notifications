'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import TagBadge from '../../../components/TagBadge';

const COLORS = ['#3b82f6','#ef4444','#22c55e','#f97316','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f59e0b','#6b7280'];

export default function EtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [nombre,    setNombre]    = useState('');
  const [color,     setColor]     = useState(COLORS[0]);
  const [saving,    setSaving]    = useState(false);

  const sb = createClient();

  const load = async () => {
    const { data } = await sb.from('etiquetas').select('*').order('es_predeterminada', { ascending: false }).order('nombre');
    setEtiquetas(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setNombre(''); setColor(COLORS[0]); setShowModal(true); };
  const openEdit = (e) => { if (e.es_predeterminada) return; setEditing(e); setNombre(e.nombre); setColor(e.color); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    if (editing) await sb.from('etiquetas').update({ nombre: nombre.trim(), color }).eq('id', editing.id);
    else         await sb.from('etiquetas').insert({ nombre: nombre.trim(), color, es_predeterminada: false });
    setShowModal(false); await load(); setSaving(false);
  };

  const handleDelete = async (et) => {
    if (et.es_predeterminada || !confirm(`¿Eliminar "${et.nombre}"?`)) return;
    await sb.from('etiquetas').delete().eq('id', et.id);
    setEtiquetas((p) => p.filter((x) => x.id !== et.id));
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 spinner"/></div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="page-header">
        <div><h1 className="page-title">Etiquetas</h1><p className="page-sub">{etiquetas.length} etiquetas</p></div>
        <button onClick={openAdd} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nueva etiqueta
        </button>
      </div>

      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="table-head"><tr>
            <th className="th">Etiqueta</th>
            <th className="th">Color</th>
            <th className="th">Tipo</th>
            <th className="th"/>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {etiquetas.map((et) => (
              <tr key={et.id} className={`hover:bg-gray-50 ${!et.es_predeterminada ? 'cursor-pointer' : ''}`} onClick={() => openEdit(et)}>
                <td className="td"><TagBadge tag={et} /></td>
                <td className="td"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor:et.color}}/><span className="text-xs font-mono text-gray-400">{et.color}</span></div></td>
                <td className="td">{et.es_predeterminada ? <span className="badge badge-gray">Predeterminada</span> : <span className="badge badge-blue">Personalizada</span>}</td>
                <td className="td text-right">
                  {!et.es_predeterminada && (
                    <button onClick={(e)=>{e.stopPropagation();handleDelete(et);}} className="text-xs text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Editar etiqueta' : 'Nueva etiqueta'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="input-group"><label className="label">Nombre</label><input className="input" value={nombre} onChange={(e)=>setNombre(e.target.value)} placeholder="Ej. Contrato, Seguro..." required/></div>
              <div>
                <label className="label">Color</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={()=>setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${color===c?'scale-125 ring-2 ring-offset-2 ring-gray-300':''}`}
                      style={{backgroundColor:c}}/>
                  ))}
                </div>
              </div>
              {nombre && <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Vista previa:</span><TagBadge tag={{nombre,color}}/></div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'...':editing?'Guardar':'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
