'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/client';
import RecordatorioForm from '../../../../components/RecordatorioForm';

export default function EditarPage() {
  const { id } = useParams();
  const [rec,       setRec]       = useState(null);
  const [etiquetas, setEtiquetas] = useState([]);
  const [usuarios,  setUsuarios]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!id) return;
    const sb = createClient();
    Promise.all([
      sb.from('recordatorios').select('*, etiquetas:recordatorio_etiquetas(etiqueta:etiquetas(*)), empleados:recordatorio_empleados(*), usuariosAsignados:recordatorio_usuarios(profile:profiles(*))').eq('id', id).single(),
      sb.from('etiquetas').select('*').order('nombre'),
      sb.from('profiles').select('id, nombre').order('nombre'),
    ]).then(([{ data: r }, { data: e }, { data: u }]) => {
      if (r) setRec({
        ...r,
        etiquetas: r.etiquetas?.map((re) => re.etiqueta).filter(Boolean) ?? [],
        empleados: r.empleados ?? [],
        usuariosAsignados: r.usuariosAsignados?.map((ru) => ru.profile).filter(Boolean) ?? [],
      });
      setEtiquetas(e ?? []);
      setUsuarios(u ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar recordatorio</h1>
      <RecordatorioForm recordatorio={rec} etiquetas={etiquetas} usuarios={usuarios} />
    </div>
  );
}
