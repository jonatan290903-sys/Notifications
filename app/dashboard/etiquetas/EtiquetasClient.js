'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import TagBadge from '../../../components/TagBadge';

const COLORS = ['#3b82f6','#ef4444','#22c55e','#f97316','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f59e0b','#6b7280'];

export default function EtiquetasClient({ etiquetas: initial, supabaseUrl, supabaseKey }) {
  const router   = useRouter();
  const sb = () => createBrowserClient(supabaseUrl, supabaseKey);

  const [etiquetas, setEtiquetas] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [nombre,    setNombre]    = useState('');
  const [color,     setColor]     = useState(COLORS[0]);
  const [saving,    setSaving]    = useState(false);

  const openAdd  = () => { setEditing(null); setNombre(''); setColor(COLORS[0]); setShowModal(true); };
  const openEdit = (e) => {
    if (e.es_predeterminada) return alert('Las etiquetas predeterminadas no se pueden editar.');
    setEditing(e); setNombre(e.nombre); setColor(e.color); setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    const supabase = sb();
    if (editing) {
      await supabase.from('etiquetas').update({ nombre: nombre.trim(), color }).eq('id', editing.id);
    } else {
      await supabase.from('etiquetas').insert({ nombre: nombre.trim(), color, es_predeterminada: false });
    }
    setShowModal(false);
    router.refresh();
    setSaving(false);
  };

  const handleDelete = async (et) => {
    if (et.es_predeterminada) return alert('No se pueden eliminar las etiquetas predeterminadas.');
    if (!confirm(`¿Eliminar "${et.nombre}"?`)) return;
    await sb().from('etiquetas').delete().eq('id', et.id);
    setEtiquetas((p) => p.filter((x) => x.id !== et.id));
  };

  return (
    <>
      <div className="card overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">{etiquetas.length} etiquetas</p>
          <button onClick={openAdd} className="btn-primary text-sm px-3 py-1.5">+ Nueva etiqueta</button>
        </div>
        <div className="divide-y divide-gray-50">
          {etiquetas.map((et) => (
            <div key={et.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
              <TagBadge tag={et} />
              <span className="text-xs text-gray-300 font-mono">{et.color}</span>
              {et.es_predeterminada && <span className="text-xs text-gray-400 italic">Predeterminada</span>}
              <div className="ml-auto flex gap-3">
                {!et.es_predeterminada && (
                  <>
                    <button onClick={() => openEdit(et)} className="text-sm text-brand-600 hover:underline">Editar</button>
                    <button onClick={() => handleDelete(et)} className="text-sm text-red-500 hover:underline">Eliminar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Editar etiqueta' : 'Nueva etiqueta'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Contrato, Seguro..." required />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLORS.map((c) => (
                    <button
                      key={c} type="button" onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {nombre && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Vista previa:</span>
                  <TagBadge tag={{ nombre, color }} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? '...' : editing ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
