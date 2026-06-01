'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import RecordatorioForm from '../../../../components/RecordatorioForm';

export default function NuevoPage() {
  const [etiquetas, setEtiquetas] = useState([]);
  const [usuarios,  setUsuarios]  = useState([]);

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from('etiquetas').select('*').order('nombre'),
      sb.from('profiles').select('id, nombre').order('nombre'),
    ]).then(([{ data: e }, { data: u }]) => {
      setEtiquetas(e ?? []);
      setUsuarios(u ?? []);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo recordatorio</h1>
      <RecordatorioForm recordatorio={null} etiquetas={etiquetas} usuarios={usuarios} />
    </div>
  );
}
