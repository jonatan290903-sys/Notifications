'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import TagBadge from '../../../components/TagBadge';
import { differenceInDays, parseISO } from 'date-fns';

function daysUntil(f) { return f ? differenceInDays(parseISO(f), new Date()) : null; }

function UrgencyBadge({ days }) {
  if (days === null) return null;
  const label = days < 0 ? `Venció hace ${Math.abs(days)}d` : days === 0 ? '¡Hoy!' : days === 1 ? 'Mañana' : `En ${days}d`;
  const cls   = days <= 0 ? 'badge-red' : days <= 7 ? 'badge-orange' : days <= 15 ? 'badge-yellow' : 'badge-green';
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function RecordatoriosPage() {
  const searchParams = useSearchParams();
  const filtroEt = searchParams.get('etiqueta');
  const search   = (searchParams.get('q') ?? '').toLowerCase();

  const [records,   setRecords]   = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(null); // id of expanded row
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from('recordatorios')
        .select('*, etiquetas:recordatorio_etiquetas(etiqueta:etiquetas(*)), empleados:recordatorio_empleados(*), usuarios:recordatorio_usuarios(profile:profiles(id,nombre))')
        .order('fecha', { ascending: true }),
      sb.from('etiquetas').select('*').order('nombre'),
    ]).then(([{ data: recs }, { data: ets }]) => {
      setRecords((recs || []).map((r) => ({
        ...r,
        etiquetas:  r.etiquetas?.map((re) => re.etiqueta).filter(Boolean) ?? [],
        empleados:  r.empleados ?? [],
        usuarios:   r.usuarios?.map((ru) => ru.profile).filter(Boolean) ?? [],
        days: r.tipo === 'fecha' ? daysUntil(r.fecha) : null,
      })));
      setEtiquetas(ets || []);
      setLoading(false);
    });
  }, []);

  let filtered = records;
  if (filtroEt) filtered = filtered.filter((r) => r.etiquetas.some((e) => e.id === filtroEt));
  if (search)   filtered = filtered.filter((r) => r.titulo.toLowerCase().includes(search) || r.empleados.some((e) => e.nombre.toLowerCase().includes(search)));
  if (fechaDesde) filtered = filtered.filter((r) => r.fecha && r.fecha >= fechaDesde);
  if (fechaHasta) filtered = filtered.filter((r) => r.fecha && r.fecha <= fechaHasta);

  const clearDateFilter = () => { setFechaDesde(''); setFechaHasta(''); };
  const hasDateFilter = fechaDesde || fechaHasta;
  const toggleExpand = (id) => setExpanded((prev) => prev === id ? null : id);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 spinner" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Recordatorios</h1>
          <p className="page-sub">{filtered.length} registros</p>
        </div>
        <Link href="/dashboard/recordatorios/nuevo" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nuevo recordatorio
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Link href="/dashboard/recordatorios"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${!filtroEt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
          Todos ({records.length})
        </Link>
        {etiquetas.map((e) => {
          const count = records.filter((r) => r.etiquetas.some((et) => et.id === e.id)).length;
          return (
            <Link key={e.id} href={`/dashboard/recordatorios?etiqueta=${e.id}`}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
              style={filtroEt===e.id ? {backgroundColor:e.color,color:'#fff',borderColor:e.color} : {color:e.color,borderColor:e.color+'55',backgroundColor:e.color+'11'}}>
              {e.nombre} ({count})
            </Link>
          );
        })}
      </div>

      {/* Date Filter */}
      <div className="mb-5">
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
            hasDateFilter
              ? 'bg-blue-600 text-white border-blue-600'
              : showDateFilter
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Filtrar por fecha
          {hasDateFilter && (
            <span className="bg-white/20 px-1.5 rounded text-xs">Activo</span>
          )}
        </button>

        {showDateFilter && (
          <div className="mt-2 flex flex-wrap items-end gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="input-group" style={{marginBottom:0}}>
              <label className="label">Desde</label>
              <input
                type="date"
                className="input"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={{minWidth:'160px'}}
              />
            </div>
            <div className="input-group" style={{marginBottom:0}}>
              <label className="label">Hasta</label>
              <input
                type="date"
                className="input"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={{minWidth:'160px'}}
              />
            </div>
            {hasDateFilter && (
              <button onClick={clearDateFilter} className="btn-ghost text-xs px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50">
                <svg className="w-3.5 h-3.5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                Limpiar filtro
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-semibold">Sin recordatorios</p>
            <p className="text-sm mt-1">Crea uno nuevo con el botón de arriba</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="th">Recordatorio</th>
                <th className="th">Fecha</th>
                <th className="th">Etiquetas</th>
                <th className="th">Estado</th>
                <th className="th">Empleados</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec) => (
                <>
                  <tr
                    key={rec.id}
                    className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${expanded === rec.id ? 'bg-blue-50/40' : ''}`}
                  >
                    {/* Title */}
                    <td className="td">
                      <p className="font-semibold text-gray-900">{rec.titulo}</p>
                      {rec.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{rec.descripcion}</p>}
                    </td>

                    {/* Fecha */}
                    <td className="td text-gray-600 whitespace-nowrap">
                      {rec.tipo === 'fecha'
                        ? rec.fecha ? new Date(rec.fecha + 'T00:00:00').toLocaleDateString('es-BO') : '—'
                        : <span className="badge badge-blue">Día {rec.dia_del_mes}</span>
                      }
                    </td>

                    {/* Etiquetas */}
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {rec.etiquetas.map((t) => <TagBadge key={t.id} tag={t} small />)}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${rec.activo ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <UrgencyBadge days={rec.days} />
                      </div>
                    </td>

                    {/* Empleados */}
                    <td className="td">
                      {rec.empleados.length > 0 ? (
                        <button
                          onClick={() => toggleExpand(rec.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            expanded === rec.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          {rec.empleados.length} empleado{rec.empleados.length !== 1 ? 's' : ''}
                          <svg className={`w-3 h-3 transition-transform ${expanded === rec.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="td text-right">
                      <Link href={`/dashboard/recordatorios/${rec.id}`} className="btn-ghost text-xs px-3 py-1.5">
                        Editar
                      </Link>
                    </td>
                  </tr>

                  {/* Expanded employee row */}
                  {expanded === rec.id && rec.empleados.length > 0 && (
                    <tr key={`${rec.id}-expanded`} className="bg-blue-50/60 border-b border-blue-100">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-semibold text-blue-600 whitespace-nowrap mt-0.5">Empleados:</span>
                          <div className="flex flex-wrap gap-2">
                            {rec.empleados.map((emp, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs shadow-sm">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {emp.nombre?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{emp.nombre}</p>
                                  {emp.documento && <p className="text-gray-400">Doc: {emp.documento}</p>}
                                  {emp.fecha_ingreso && <p className="text-gray-400">Ingreso: {emp.fecha_ingreso}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {!rec.todos_usuarios && rec.usuarios.length > 0 && (
                          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-blue-100">
                            <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">Notifica a:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {rec.usuarios.map((u) => (
                                <span key={u.id} className="badge badge-blue">{u.nombre}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
