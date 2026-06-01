import { createClient } from '../../../../lib/supabase/server';
import RecordatorioForm from '../../../../components/RecordatorioForm';

export default async function NuevoRecordatorioPage() {
  const supabase = await createClient();
  const [{ data: etiquetas }, { data: usuarios }] = await Promise.all([
    supabase.from('etiquetas').select('*').order('nombre'),
    supabase.from('profiles').select('id, nombre, es_admin').order('nombre'),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo recordatorio</h1>
      <RecordatorioForm
        recordatorio={null}
        etiquetas={etiquetas ?? []}
        usuarios={usuarios ?? []}
      />
    </div>
  );
}
