import { createClient } from '../../../../lib/supabase/server';
import { notFound } from 'next/navigation';
import RecordatorioForm from '../../../../components/RecordatorioForm';

export default async function EditarRecordatorioPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rec }, { data: etiquetas }, { data: usuarios }] = await Promise.all([
    supabase
      .from('recordatorios')
      .select(`*, etiquetas:recordatorio_etiquetas(etiqueta:etiquetas(*)), empleados:recordatorio_empleados(*), usuariosAsignados:recordatorio_usuarios(profile:profiles(*))`)
      .eq('id', id)
      .single(),
    supabase.from('etiquetas').select('*').order('nombre'),
    supabase.from('profiles').select('id, nombre').order('nombre'),
  ]);

  if (!rec) notFound();

  const enriched = {
    ...rec,
    etiquetas: rec.etiquetas?.map((re) => re.etiqueta).filter(Boolean) ?? [],
    empleados: rec.empleados ?? [],
    usuariosAsignados: rec.usuariosAsignados?.map((ru) => ru.profile).filter(Boolean) ?? [],
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar recordatorio</h1>
      <RecordatorioForm
        recordatorio={enriched}
        etiquetas={etiquetas ?? []}
        usuarios={usuarios ?? []}
      />
    </div>
  );
}
