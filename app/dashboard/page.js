'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import TagBadge from '../../components/TagBadge';
import { differenceInDays, parseISO } from 'date-fns';

function daysUntil(f) { return f ? differenceInDays(parseISO(f), new Date()) : null; }
function urgencyClass(d) { return d===null?'text-gray-400':d<=0?'text-red-600 font-bold':d<=7?'text-orange-500 font-semibold':d<=15?'text-yellow-600 font-semibold':'text-green-600'; }
function urgencyLabel(d) { return d===null?'':d<0?`Venció hace ${Math.abs(d)}d`:d===0?'¡Hoy!':d===1?'Mañana':`${d}d`; }

export default function DashboardPage() {
  const [records,  setRecords]  = useState([]);
  const [proximos, setProximos] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('recordatorios')
      .select('*, etiquetas:recordatorio_etiquetas(etiqueta:etiquetas(*)), empleados:recordatorio_empleados(*)')
      .eq('activo', true)
      .order('fecha', { ascending: true })
      .then(({ data }) => {
        const recs = (data || []).map((r) => ({
          ...r,
          etiquetas: r.etiquetas?.map((re) => re.etiqueta).filter(Boolean) ?? [],
          days: r.tipo === 'fecha' ? daysUntil(r.fecha) : null,
        }));
        setRecords(recs);
        setProximos(recs.filter((r) => r.days !== null && r.days >= 0 && r.days <= 30).sort((a,b) => a.days-b.days));
        setLoading(false);
      });
  }, []);

  const stats = [
    { label: 'Vencen hoy',   value: records.filter((r) => r.days === 0).length,              color: 'text-red-600',    bg: 'bg-red-50'   },
    { label: 'Próximos 7d',  value: records.filter((r) => r.days > 0 && r.days <= 7).length,  color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Próximos 30d', value: records.filter((r) => r.days > 7 && r.days <= 30).length, color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Total activos',value: records.length,                                            color: 'text-gray-700',   bg: 'bg-gray-100'  },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
        <p className="text-gray-500 mt-1">Próximos vencimientos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`card p-5 ${s.bg}`}>
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Vencimientos próximos (30 días)</h2>
          <Link href="/dashboard/recordatorios" className="text-sm text-brand-600 hover:underline font-medium">Ver todos →</Link>
        </div>
        {proximos.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><p className="text-lg">✅ Todo al día</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {proximos.map((rec) => (
              <Link key={rec.id} href={`/dashboard/recordatorios/${rec.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className={`text-sm font-bold w-24 flex-shrink-0 ${urgencyClass(rec.days)}`}>{urgencyLabel(rec.days)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{rec.titulo}</p>
                  {rec.empleados?.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{rec.empleados.length} empleado{rec.empleados.length!==1?'s':''}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {rec.etiquetas?.slice(0,2).map((t) => <TagBadge key={t.id} tag={t} small />)}
                  <span className="text-xs text-gray-400">{rec.fecha ? new Date(rec.fecha+'T00:00:00').toLocaleDateString('es-BO') : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
