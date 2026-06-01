'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import TagBadge from './TagBadge';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

const DIAS = [1, 3, 7, 15, 30];

// ── Excel Import Modal ────────────────────────────────────────────────────────

function ExcelModal({ onClose, onImport }) {
  const [headers,   setHeaders]   = useState([]);
  const [rows,      setRows]      = useState([]);
  const [fileName,  setFileName]  = useState('');
  const [colNombre, setColNombre] = useState(null);
  const [colFecha,  setColFecha]  = useState(null);
  const [colDoc,    setColDoc]    = useState(null);
  const [modo,      setModo]      = useState('individual');
  const [loading,   setLoading]   = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb  = xlsxRead(buf, { type: 'array', raw: false });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const all = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
      if (all.length < 2) return;
      const hdrs = all[0].map((h, i) => String(h || `Col ${i+1}`));
      setHeaders(hdrs);
      setRows(all.slice(1).filter((r) => r.some((c) => String(c).trim())));
      // Auto-detect
      const f = (kws) => hdrs.find((h) => kws.some((k) => h.toLowerCase().includes(k)));
      setColNombre(f(['nombre','name','empleado','trabajador','apellido']) ?? null);
      setColFecha(f(['retiro','salida','baja','fecha','date','egreso','fin']) ?? null);
      setColDoc(f(['doc','ci','cedula','documento']) ?? null);
    } finally { setLoading(false); e.target.value = ''; }
  };

  const parseDate = (v) => {
    if (!v) return null;
    const s = String(v).trim();
    const p = s.split(/[\/\-\.]/);
    if (p.length === 3) {
      const [a,b,c] = p;
      if (a.length===4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
      if (c.length===4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    }
    const n = parseFloat(s);
    if (!isNaN(n) && n > 10000) return new Date(Date.UTC(1899,11,30+n)).toISOString().split('T')[0];
    return null;
  };

  const handleImport = () => {
    if (!colNombre) return alert('Selecciona la columna de Nombre');
    const ni = headers.indexOf(colNombre);
    const fi = colFecha ? headers.indexOf(colFecha) : -1;
    const di = colDoc   ? headers.indexOf(colDoc)   : -1;
    const data = rows.map((r) => ({
      nombre:    String(r[ni]??'').trim(),
      fecha:     fi>=0 ? parseDate(r[fi]) : null,
      documento: di>=0 ? String(r[di]??'').trim() : '',
    })).filter((r) => r.nombre);
    onImport(data, modo);
    onClose();
  };

  const preview = rows.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Importar desde Excel</h2>
            <p className="text-xs text-gray-400 mt-0.5">Selecciona qué columnas usar para cada campo</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* File picker */}
          <div>
            <label className="label">Archivo Excel / CSV</label>
            <label className="btn-secondary w-full justify-center cursor-pointer">
              {loading ? <span className="w-4 h-4 spinner" /> : <>{fileName ? `✓ ${fileName}` : '📂 Seleccionar archivo'}</>}
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </label>
            {rows.length > 0 && <p className="text-xs text-emerald-600 font-semibold mt-2">✓ {rows.length} filas encontradas</p>}
          </div>

          {headers.length > 0 && (<>
            {/* Column mapping */}
            {[
              { label: '👤 Columna de Nombre *', val: colNombre, set: setColNombre },
              { label: '📅 Columna de Fecha (retiro/evento)', val: colFecha,  set: setColFecha  },
              { label: '🪪 Columna de Documento', val: colDoc,    set: setColDoc    },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <p className="label">{label}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button" onClick={() => set(null)}
                    className={`chip ${!val ? 'chip-on' : 'chip-off'}`}
                  >— Ninguna —</button>
                  {headers.map((h) => (
                    <button
                      key={h} type="button" onClick={() => set(h)}
                      className={`chip ${val===h ? 'chip-on' : 'chip-off'}`}
                    >{h}</button>
                  ))}
                </div>
              </div>
            ))}

            {/* Modo */}
            <div>
              <p className="label">Modo de importación</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v:'individual', icon:'👤', t:'Un recordatorio por empleado', d:'Cada fila = su propia fecha y recordatorio individual' },
                  { v:'grupo',      icon:'👥', t:'Todos en el formulario',        d:'Los empleados se agregan al recordatorio actual' },
                ].map((opt) => (
                  <button
                    key={opt.v} type="button" onClick={() => setModo(opt.v)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${modo===opt.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <p className={`text-sm font-bold ${modo===opt.v?'text-blue-700':'text-gray-700'}`}>{opt.icon} {opt.t}</p>
                    <p className="text-xs text-gray-400 mt-1">{opt.d}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {colNombre && (
              <div>
                <p className="label">Vista previa (primeras 5 filas)</p>
                <div className="table-wrap overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="table-head"><tr>
                      {colNombre && <th className="th">Nombre</th>}
                      {colFecha  && <th className="th">Fecha</th>}
                      {colDoc    && <th className="th">Documento</th>}
                    </tr></thead>
                    <tbody className="tr-divider">
                      {preview.map((r,i) => {
                        const ni = headers.indexOf(colNombre);
                        const fi = colFecha ? headers.indexOf(colFecha) : -1;
                        const di = colDoc   ? headers.indexOf(colDoc)   : -1;
                        return (
                          <tr key={i}>
                            {colNombre && <td className="td">{String(r[ni]??'')}</td>}
                            {colFecha  && <td className="td">{String(r[fi]??'')}</td>}
                            {colDoc    && <td className="td">{String(r[di]??'')}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">... y {Math.max(0,rows.length-5)} filas más</p>
              </div>
            )}
          </>)}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            type="button" onClick={handleImport}
            disabled={!colNombre || rows.length===0}
            className="btn-green flex-1 disabled:opacity-40"
          >
            Importar {rows.length} registros
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function RecordatorioForm({ recordatorio: rec, etiquetas, usuarios }) {
  const router  = useRouter();

  const [titulo,          setTitulo]          = useState(rec?.titulo ?? '');
  const [desc,            setDesc]            = useState(rec?.descripcion ?? '');
  const [tipo,            setTipo]            = useState(rec?.tipo ?? 'fecha');
  const [fecha,           setFecha]           = useState(rec?.fecha ?? '');
  const [diaDelMes,       setDiaDelMes]       = useState(rec?.dia_del_mes ?? 1);
  const [diasAnticipacion,setDiasAnticipacion]= useState(rec?.dias_anticipacion ?? [7]);
  const [etiquetaIds,     setEtiquetaIds]     = useState(rec?.etiquetas?.map((e)=>e.id) ?? []);
  const [empleados,       setEmpleados]       = useState(rec?.empleados?.map((e)=>({nombre:e.nombre,documento:e.documento??'',fecha_ingreso:e.fecha_ingreso??''})) ?? []);
  const [todosUsuarios,   setTodosUsuarios]   = useState(rec?.todos_usuarios !== false);
  const [usuarioIds,      setUsuarioIds]      = useState(rec?.usuariosAsignados?.map((u)=>u.id) ?? []);
  const [nuevoEmp,        setNuevoEmp]        = useState('');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [showExcel,       setShowExcel]       = useState(false);

  const toggleDia  = (d) => setDiasAnticipacion((p) => p.includes(d)?p.filter((x)=>x!==d):[...p,d].sort((a,b)=>a-b));
  const toggleEt   = (id) => setEtiquetaIds((p) => p.includes(id)?p.filter((x)=>x!==id):[...p,id]);
  const toggleUser = (id) => setUsuarioIds((p) => p.includes(id)?p.filter((x)=>x!==id):[...p,id]);

  const addEmp = () => {
    const t = nuevoEmp.trim();
    if (!t) return;
    const [nombre='',documento=''] = t.split(',').map((s)=>s.trim());
    setEmpleados((p)=>[...p,{nombre,documento,fecha_ingreso:''}]);
    setNuevoEmp('');
  };

  const handleExcelImport = async (data, modo) => {
    if (modo === 'grupo') {
      setEmpleados((p) => [...p, ...data]);
      return;
    }
    // Individual: create recordatorio per row
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!data.some((r) => r.fecha)) { alert('No se encontraron fechas. Selecciona la columna de Fecha.'); return; }
    let ok = 0;
    for (const row of data) {
      if (!row.nombre || !row.fecha) continue;
      const { data: newRec } = await sb.from('recordatorios').insert({
        titulo: row.nombre,
        descripcion: row.documento ? `Doc: ${row.documento}` : null,
        tipo: 'fecha', fecha: row.fecha,
        dias_anticipacion: diasAnticipacion,
        todos_usuarios: todosUsuarios,
        creado_por: user?.id,
      }).select().single();
      if (newRec && etiquetaIds.length > 0) {
        await sb.from('recordatorio_etiquetas').insert(etiquetaIds.map((eid)=>({recordatorio_id:newRec.id,etiqueta_id:eid})));
      }
      if (newRec) {
        await sb.from('recordatorio_empleados').insert({recordatorio_id:newRec.id,nombre:row.nombre,documento:row.documento||null});
        if (!todosUsuarios && usuarioIds.length > 0) {
          await sb.from('recordatorio_usuarios').insert(usuarioIds.map((uid)=>({recordatorio_id:newRec.id,usuario_id:uid})));
        }
        ok++;
      }
    }
    alert(`✅ ${ok} recordatorios creados individualmente.`);
    router.push('/dashboard/recordatorios');
    router.refresh();
  };

  const handleSave = async () => {
    if (!titulo.trim()) return setError('El título es obligatorio');
    if (diasAnticipacion.length === 0) return setError('Selecciona días de anticipación');
    if (!todosUsuarios && usuarioIds.length === 0) return setError('Selecciona al menos un usuario');
    setError(''); setSaving(true);
    const sb = createClient();
    const { data:{user} } = await sb.auth.getUser();

    const payload = {
      titulo:titulo.trim(), descripcion:desc.trim()||null, tipo,
      fecha:tipo==='fecha'?(fecha||null):null,
      dia_del_mes:tipo==='mensual'?diaDelMes:null,
      dias_anticipacion:diasAnticipacion, todos_usuarios:todosUsuarios, creado_por:user?.id,
    };

    let recId = rec?.id;
    if (rec) {
      const {error:e} = await sb.from('recordatorios').update(payload).eq('id',rec.id);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const {data,error:e} = await sb.from('recordatorios').insert(payload).select().single();
      if (e) { setError(e.message); setSaving(false); return; }
      recId = data.id;
    }
    await sb.from('recordatorio_etiquetas').delete().eq('recordatorio_id',recId);
    if (etiquetaIds.length>0) await sb.from('recordatorio_etiquetas').insert(etiquetaIds.map((eid)=>({recordatorio_id:recId,etiqueta_id:eid})));
    await sb.from('recordatorio_empleados').delete().eq('recordatorio_id',recId);
    if (empleados.length>0) await sb.from('recordatorio_empleados').insert(empleados.map((e)=>({recordatorio_id:recId,nombre:e.nombre,documento:e.documento||null,fecha_ingreso:e.fecha_ingreso||null})));
    await sb.from('recordatorio_usuarios').delete().eq('recordatorio_id',recId);
    if (!todosUsuarios&&usuarioIds.length>0) await sb.from('recordatorio_usuarios').insert(usuarioIds.map((uid)=>({recordatorio_id:recId,usuario_id:uid})));

    router.push('/dashboard/recordatorios');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!rec||!confirm(`¿Eliminar "${rec.titulo}"?`)) return;
    await createClient().from('recordatorios').delete().eq('id',rec.id);
    router.push('/dashboard/recordatorios');
    router.refresh();
  };

  return (
    <div className="max-w-2xl space-y-5 pb-10">
      {showExcel && <ExcelModal onClose={()=>setShowExcel(false)} onImport={handleExcelImport} />}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Título */}
      <div className="section">
        <p className="section-title">Información general</p>
        <div className="input-group"><label className="label">Título *</label><input className="input" value={titulo} onChange={(e)=>setTitulo(e.target.value)} placeholder="Ej. Baja de empleados, Pago AFP..."/></div>
        <div className="input-group"><label className="label">Descripción</label><textarea className="input resize-none" rows={2} value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Detalles opcionales..."/></div>
      </div>

      {/* Etiquetas */}
      <div className="section">
        <p className="section-title">Etiquetas</p>
        <div className="flex flex-wrap gap-2">
          {etiquetas.map((e) => (
            <button key={e.id} type="button" onClick={()=>toggleEt(e.id)}
              className="rounded-full border-2 px-3 py-1 text-sm font-semibold transition-all"
              style={etiquetaIds.includes(e.id)?{backgroundColor:e.color,color:'#fff',borderColor:e.color}:{backgroundColor:e.color+'11',color:e.color,borderColor:e.color+'44'}}>
              {e.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Fecha */}
      <div className="section">
        <p className="section-title">Fecha / Recurrencia</p>
        <div className="flex gap-2">
          {[{v:'fecha',l:'Fecha exacta'},{v:'mensual',l:'Mensual'}].map((opt)=>(
            <button key={opt.v} type="button" onClick={()=>setTipo(opt.v)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${tipo===opt.v?'bg-blue-50 border-blue-500 text-blue-700':'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {opt.l}
            </button>
          ))}
        </div>
        {tipo==='fecha'
          ? <div className="input-group"><label className="label">Fecha del evento</label><input type="date" className="input" value={fecha} onChange={(e)=>setFecha(e.target.value)}/></div>
          : <div className="input-group"><label className="label">Día del mes (1–28)</label><input type="number" className="input w-28" min={1} max={28} value={diaDelMes} onChange={(e)=>setDiaDelMes(+e.target.value)}/></div>
        }
        <div>
          <label className="label">Avisar con anticipación</label>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d)=>(
              <button key={d} type="button" onClick={()=>toggleDia(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${diasAnticipacion.includes(d)?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empleados */}
      <div className="section">
        <div className="flex items-center justify-between">
          <p className="section-title">Empleados / Personas</p>
          <button type="button" onClick={()=>setShowExcel(true)} className="btn-secondary text-xs px-3 py-1.5">
            📂 Importar Excel
          </button>
        </div>
        <p className="text-xs text-gray-400 -mt-1">Formato: Nombre, Documento (Enter para agregar)</p>

        {empleados.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {empleados.map((emp,i)=>(
              <span key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-3 py-1 text-xs font-semibold">
                {emp.nombre}{emp.documento?` · ${emp.documento}`:''}
                <button type="button" onClick={()=>setEmpleados((p)=>p.filter((_,j)=>j!==i))} className="text-blue-400 hover:text-blue-700 font-bold">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input className="input flex-1" value={nuevoEmp} onChange={(e)=>setNuevoEmp(e.target.value)} placeholder="Nombre, Documento..." onKeyDown={(e)=>e.key==='Enter'&&(e.preventDefault(),addEmp())}/>
          <button type="button" onClick={addEmp} className="btn-primary px-4">Agregar</button>
        </div>
      </div>

      {/* Usuarios */}
      <div className="section">
        <p className="section-title">¿Quién recibe la notificación?</p>
        <div className="flex gap-2">
          {[{v:true,l:'Todos'},{v:false,l:'Seleccionar'}].map((opt)=>(
            <button key={String(opt.v)} type="button" onClick={()=>setTodosUsuarios(opt.v)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${todosUsuarios===opt.v?'bg-blue-50 border-blue-500 text-blue-700':'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {opt.l}
            </button>
          ))}
        </div>
        {!todosUsuarios && (
          <div className="flex flex-wrap gap-2 pt-1">
            {usuarios.map((u)=>(
              <button key={u.id} type="button" onClick={()=>toggleUser(u.id)}
                className={`chip ${usuarioIds.includes(u.id)?'chip-on':'chip-off'}`}>
                {usuarioIds.includes(u.id)?'✓ ':''}{u.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5">
          {saving ? <><span className="w-4 h-4 spinner"/>Guardando...</> : rec ? 'Guardar cambios' : 'Crear recordatorio'}
        </button>
        {rec && <button type="button" onClick={handleDelete} className="btn-danger px-6">Eliminar</button>}
      </div>
    </div>
  );
}
