import { createClient } from '../../../lib/supabase/server';
import EtiquetasClient from './EtiquetasClient';

export default async function EtiquetasPage() {
  const supabase = await createClient();
  const { data: etiquetas } = await supabase.from('etiquetas').select('*').order('es_predeterminada', { ascending: false }).order('nombre');
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Etiquetas</h1>
      <EtiquetasClient
        etiquetas={etiquetas ?? []}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
        supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
      />
    </div>
  );
}
