import { createClient } from '../../../lib/supabase/server';
import Link from 'next/link';
import TagBadge from '../../../components/TagBadge';
import { differenceInDays, parseISO } from 'date-fns';

function daysUntil(fecha) {
  if (!fecha) return null;
  return differenceInDays(parseISO(fecha), new Date());
}

function urgencyBadge(days) {
  if (days === null) return null;
  const label = days < 0 ? `Venció hace ${Math.abs(days)}d` : days === 0 ? '¡Hoy!' : days === 1 ? 'Mañana' : `${days}d`;
  const cls   = days <= 0 ? 'bg-red-100 text-red-700' : days <= 7 ? 'bg-orange-100 text-orange-700' : days <= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default async function RecordatoriosPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: etiquetas } = await supabase.from('etiquetas').select('*').order('nombre');

  const query = supabase
    .from('recordatorios')
    .select(`*, etiquetas:recordatorio_etiquetas(etiqueta:etiquetas(*)), empleados:recordatorio_empleados(count)`)
    .order('fecha', { ascending: true });

  const { data: rawRecs } = await query;
  const params = await searchParams;
  const filtroEt = params?.etiqueta;
  const search   = params?.q?.toLowerCase() ?? '';

  let records = (rawRecs || []).map((r) => ({
    ...r,
    etiquetas: r.etiquetas?.map((re) => re.etiqueta).filter(Boolean) ?? [],
    empleadosCount: r.empleados?.[0]?.count ?? 0,
    days: r.tipo === 'fecha' ? daysUntil(r.fecha) : null,
  }));

  if (filtroEt) records = records.filter((r) => r.etiquetas.some((e) => e.id === filtroEt));
  if (search)   records = records.filter((r) => r.titulo.toLowerCase().includes(search));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recordatorios</h1>
          <p className="text-gray-400 text-sm mt-0.5">{records.length} registros</p>
        </div>
        <Link href="/dashboard/recordatorios/nuevo" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo recordatorio
        </Link>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          name="q" defaultValue={search}
          placeholder="Buscar por título..."
          className="input max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/dashboard/recordatorios"
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${!filtroEt ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            Todos
          </Link>
          {(etiquetas || []).map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/recordatorios?etiqueta=${e.id}`}
              className="px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors"
              style={filtroEt === e.id ? { backgroundColor: e.color, color: '#fff', borderColor: e.color } : { color: e.color, borderColor: e.color + '55', backgroundColor: e.color + '11' }}
            >
              {e.nombre}
            </Link>
          ))}
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        {records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Sin resultados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500">Título</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500">Fecha</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500">Etiquetas</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900">{rec.titulo}</p>
                    {rec.empleadosCount > 0 && (
                      <p className="text-xs text-gray-400">{rec.empleadosCount} empleado{rec.empleadosCount !== 1 ? 's' : ''}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {rec.tipo === 'fecha'
                      ? rec.fecha ? new Date(rec.fecha + 'T00:00:00').toLocaleDateString('es-BO') : '—'
                      : `Día ${rec.dia_del_mes} c/mes`
                    }
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rec.etiquetas.map((t) => <TagBadge key={t.id} tag={t} small />)}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {rec.activo
                        ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      }
                      {urgencyBadge(rec.days)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/recordatorios/${rec.id}`}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
