'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import TagBadge from './TagBadge';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

const DIAS_OPT = [1, 3, 7, 15, 30];

export default function RecordatorioForm({ recordatorio, etiquetas, usuarios }) {
  const router = useRouter();
  const rec = recordatorio;

  const [titulo,          setTitulo]          = useState(rec?.titulo ?? '');
  const [desc,            setDesc]            = useState(rec?.descripcion ?? '');
  const [tipo,            setTipo]            = useState(rec?.tipo ?? 'fecha');
  const [fecha,           setFecha]           = useState(rec?.fecha ?? '');
  const [diaDelMes,       setDiaDelMes]       = useState(rec?.dia_del_mes ?? 1);
  const [diasAnticipacion,setDiasAnticipacion]= useState(rec?.dias_anticipacion ?? [7]);
  const [etiquetaIds,     setEtiquetaIds]     = useState(rec?.etiquetas?.map((e) => e.id) ?? []);
  const [empleados,       setEmpleados]       = useState(rec?.empleados?.map((e) => ({ nombre: e.nombre, documento: e.documento ?? '', fecha_ingreso: e.fecha_ingreso ?? '' })) ?? []);
  const [todosUsuarios,   setTodosUsuarios]   = useState(rec?.todos_usuarios !== false);
  const [usuarioIds,      setUsuarioIds]      = useState(rec?.usuariosAsignados?.map((u) => u.id) ?? []);
  const [nuevoEmp,        setNuevoEmp]        = useState('');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [importLoading,   setImportLoading]   = useState(false);
  const fileInputRef = useRef();

  // ── helpers ──────────────────────────────────────────────────────────────
  const toggleDia  = (d) => setDiasAnticipacion((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort((a, b) => a - b));
  const toggleEt   = (id) => setEtiquetaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleUser = (id) => setUsuarioIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const addEmpleado = () => {
    const trimmed = nuevoEmp.trim();
    if (!trimmed) return;
    const [nombre, documento = ''] = trimmed.split(',').map((s) => s.trim());
    setEmpleados((p) => [...p, { nombre, documento, fecha_ingreso: '' }]);
    setNuevoEmp('');
  };

  // Excel import
  const handleExcelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = xlsxRead(buf, { type: 'array', raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsxUtils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) return;

      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      const nombreKey = keys.find((k) => /nombre|name|empleado|trabajador/i.test(k)) ?? keys[0];
      const docKey    = keys.find((k) => /doc|ci|cedula|documento/i.test(k));
      const fechaKey  = keys.find((k) => /retiro|salida|fecha|date|egreso/i.test(k));

      const imported = rows
        .map((row) => ({
          nombre: String(row[nombreKey] ?? '').trim(),
          documento: docKey ? String(row[docKey] ?? '').trim() : '',
          fecha_ingreso: fechaKey ? String(row[fechaKey] ?? '').trim() : '',
        }))
        .filter((r) => r.nombre);

      setEmpleados((p) => [...p, ...imported]);
      alert(`✅ ${imported.length} empleados importados desde Excel`);
    } catch (err) {
      alert('Error al leer el archivo: ' + err.message);
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!titulo.trim()) return setError('El título es obligatorio');
    if (diasAnticipacion.length === 0) return setError('Selecciona al menos un día de anticipación');
    if (!todosUsuarios && usuarioIds.length === 0) return setError('Selecciona al menos un usuario');
    setError('');
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      titulo: titulo.trim(),
      descripcion: desc.trim() || null,
      tipo,
      fecha: tipo === 'fecha' ? (fecha || null) : null,
      dia_del_mes: tipo === 'mensual' ? diaDelMes : null,
      dias_anticipacion: diasAnticipacion,
      todos_usuarios: todosUsuarios,
      creado_por: user?.id,
    };

    let recId = rec?.id;
    if (rec) {
      const { error: e } = await supabase.from('recordatorios').update(payload).eq('id', rec.id);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { data, error: e } = await supabase.from('recordatorios').insert(payload).select().single();
      if (e) { setError(e.message); setSaving(false); return; }
      recId = data.id;
    }

    // Sync etiquetas
    await supabase.from('recordatorio_etiquetas').delete().eq('recordatorio_id', recId);
    if (etiquetaIds.length > 0) {
      await supabase.from('recordatorio_etiquetas').insert(
        etiquetaIds.map((eid) => ({ recordatorio_id: recId, etiqueta_id: eid }))
      );
    }

    // Sync empleados
    await supabase.from('recordatorio_empleados').delete().eq('recordatorio_id', recId);
    if (empleados.length > 0) {
      await supabase.from('recordatorio_empleados').insert(
        empleados.map((e) => ({
          recordatorio_id: recId,
          nombre: e.nombre,
          documento: e.documento || null,
          fecha_ingreso: e.fecha_ingreso || null,
        }))
      );
    }

    // Sync usuarios
    await supabase.from('recordatorio_usuarios').delete().eq('recordatorio_id', recId);
    if (!todosUsuarios && usuarioIds.length > 0) {
      await supabase.from('recordatorio_usuarios').insert(
        usuarioIds.map((uid) => ({ recordatorio_id: recId, usuario_id: uid }))
      );
    }

    router.push('/dashboard/recordatorios');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!rec) return;
    if (!confirm(`¿Eliminar "${rec.titulo}"?`)) return;
    const supabase = createClient();
    await supabase.from('recordatorios').delete().eq('id', rec.id);
    router.push('/dashboard/recordatorios');
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Título */}
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Información general</h3>
        <div>
          <label className="label">Título *</label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Baja de empleados, Pago AFP..." />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea className="input resize-none" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalles opcionales..." />
        </div>
      </div>

      {/* Etiquetas */}
      <div className="card p-6">
        <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-3">Etiquetas</h3>
        <div className="flex flex-wrap gap-2">
          {etiquetas.map((e) => (
            <button
              key={e.id} type="button" onClick={() => toggleEt(e.id)}
              className="rounded-full border-2 px-3 py-1 text-sm font-semibold transition-all"
              style={etiquetaIds.includes(e.id)
                ? { backgroundColor: e.color, color: '#fff', borderColor: e.color }
                : { backgroundColor: e.color + '11', color: e.color, borderColor: e.color + '44' }
              }
            >
              {e.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Fecha */}
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Fecha / Recurrencia</h3>
        <div className="flex gap-3">
          {[{ v: 'fecha', l: 'Fecha exacta' }, { v: 'mensual', l: 'Mensual' }].map((opt) => (
            <button
              key={opt.v} type="button" onClick={() => setTipo(opt.v)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${tipo === opt.v ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-500'}`}
            >
              {opt.l}
            </button>
          ))}
        </div>

        {tipo === 'fecha' ? (
          <div>
            <label className="label">Fecha del evento</label>
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        ) : (
          <div>
            <label className="label">Día del mes (1–28)</label>
            <input type="number" className="input w-28" min={1} max={28} value={diaDelMes} onChange={(e) => setDiaDelMes(+e.target.value)} />
          </div>
        )}

        <div>
          <label className="label">Avisar con anticipación</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {DIAS_OPT.map((d) => (
              <button
                key={d} type="button" onClick={() => toggleDia(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${diasAnticipacion.includes(d) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empleados */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Empleados / Personas</h3>
          <label className="btn-secondary text-xs cursor-pointer flex items-center gap-1.5 px-3 py-1.5">
            {importLoading ? '...' : '📂 Importar Excel'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelFile} />
          </label>
        </div>
        <p className="text-xs text-gray-400">Formato: Nombre, Documento (opcional)</p>

        {empleados.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {empleados.map((emp, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-3 py-1 text-sm">
                {emp.nombre}{emp.documento ? ` · ${emp.documento}` : ''}
                <button type="button" onClick={() => setEmpleados((p) => p.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-700">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            className="input flex-1" value={nuevoEmp} onChange={(e) => setNuevoEmp(e.target.value)}
            placeholder="Nombre, Documento..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmpleado())}
          />
          <button type="button" onClick={addEmpleado} className="btn-primary px-4">Agregar</button>
        </div>
      </div>

      {/* Usuarios */}
      <div className="card p-6 space-y-3">
        <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">¿Quién recibe la notificación?</h3>
        <div className="flex gap-3">
          {[{ v: true, l: 'Todos los usuarios' }, { v: false, l: 'Seleccionar' }].map((opt) => (
            <button
              key={String(opt.v)} type="button" onClick={() => setTodosUsuarios(opt.v)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${todosUsuarios === opt.v ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-500'}`}
            >
              {opt.l}
            </button>
          ))}
        </div>
        {!todosUsuarios && (
          <div className="flex flex-wrap gap-2 pt-1">
            {usuarios.map((u) => (
              <button
                key={u.id} type="button" onClick={() => toggleUser(u.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${usuarioIds.includes(u.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                {usuarioIds.includes(u.id) ? '✓ ' : ''}{u.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 text-base">
          {saving ? 'Guardando...' : rec ? 'Guardar cambios' : 'Crear recordatorio'}
        </button>
        {rec && (
          <button type="button" onClick={handleDelete} className="btn-danger px-6 py-3">
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
