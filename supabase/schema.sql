-- ============================================================
-- RECORDATORIOS EMPRESA — Supabase Schema
-- Pega esto en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. PERFILES (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre     TEXT NOT NULL,
  es_admin   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crea perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, es_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'es_admin')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. ETIQUETAS
CREATE TABLE IF NOT EXISTS etiquetas (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre            TEXT    NOT NULL,
  color             TEXT    NOT NULL,
  es_predeterminada BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Etiquetas por defecto
INSERT INTO etiquetas (nombre, color, es_predeterminada) VALUES
  ('Empleado', '#3b82f6', TRUE),
  ('Baja',     '#ef4444', TRUE),
  ('Trámite',  '#8b5cf6', TRUE),
  ('Pago',     '#22c55e', TRUE)
ON CONFLICT DO NOTHING;

-- 3. RECORDATORIOS
CREATE TABLE IF NOT EXISTS recordatorios (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo           TEXT    NOT NULL,
  descripcion      TEXT,
  tipo             TEXT    NOT NULL DEFAULT 'fecha', -- 'fecha' | 'mensual'
  fecha            DATE,
  dia_del_mes      INTEGER,
  dias_anticipacion INTEGER[] DEFAULT ARRAY[7],
  todos_usuarios   BOOLEAN DEFAULT TRUE,
  activo           BOOLEAN DEFAULT TRUE,
  creado_por       UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: actualiza updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS recordatorios_updated_at ON recordatorios;
CREATE TRIGGER recordatorios_updated_at
  BEFORE UPDATE ON recordatorios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. RECORDATORIO <-> ETIQUETAS
CREATE TABLE IF NOT EXISTS recordatorio_etiquetas (
  recordatorio_id UUID REFERENCES recordatorios(id) ON DELETE CASCADE,
  etiqueta_id     UUID REFERENCES etiquetas(id)     ON DELETE CASCADE,
  PRIMARY KEY (recordatorio_id, etiqueta_id)
);

-- 5. EMPLEADOS
CREATE TABLE IF NOT EXISTS recordatorio_empleados (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recordatorio_id UUID REFERENCES recordatorios(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  documento       TEXT,
  fecha_ingreso   DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USUARIOS ASIGNADOS
CREATE TABLE IF NOT EXISTS recordatorio_usuarios (
  recordatorio_id UUID REFERENCES recordatorios(id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES profiles(id)      ON DELETE CASCADE,
  PRIMARY KEY (recordatorio_id, usuario_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorio_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorio_empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorio_usuarios  ENABLE ROW LEVEL SECURITY;

-- Función helper: is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT es_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- profiles
DROP POLICY IF EXISTS "profiles_read_all"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_read_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- etiquetas: todos leen, solo admin modifica
DROP POLICY IF EXISTS "etiquetas_read"  ON etiquetas;
DROP POLICY IF EXISTS "etiquetas_write" ON etiquetas;
CREATE POLICY "etiquetas_read"  ON etiquetas FOR SELECT USING (true);
CREATE POLICY "etiquetas_write" ON etiquetas FOR ALL    USING (is_admin());

-- recordatorios
DROP POLICY IF EXISTS "rec_select" ON recordatorios;
DROP POLICY IF EXISTS "rec_insert" ON recordatorios;
DROP POLICY IF EXISTS "rec_update" ON recordatorios;
DROP POLICY IF EXISTS "rec_delete" ON recordatorios;

CREATE POLICY "rec_select" ON recordatorios FOR SELECT USING (
  todos_usuarios = true
  OR creado_por = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM recordatorio_usuarios
    WHERE recordatorio_id = recordatorios.id AND usuario_id = auth.uid()
  )
);
CREATE POLICY "rec_insert" ON recordatorios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "rec_update" ON recordatorios FOR UPDATE USING (creado_por = auth.uid() OR is_admin());
CREATE POLICY "rec_delete" ON recordatorios FOR DELETE USING (creado_por = auth.uid() OR is_admin());

-- recordatorio_etiquetas
DROP POLICY IF EXISTS "re_select" ON recordatorio_etiquetas;
DROP POLICY IF EXISTS "re_write"  ON recordatorio_etiquetas;
CREATE POLICY "re_select" ON recordatorio_etiquetas FOR SELECT USING (true);
CREATE POLICY "re_write"  ON recordatorio_etiquetas FOR ALL    USING (auth.uid() IS NOT NULL);

-- recordatorio_empleados
DROP POLICY IF EXISTS "emp_select" ON recordatorio_empleados;
DROP POLICY IF EXISTS "emp_write"  ON recordatorio_empleados;
CREATE POLICY "emp_select" ON recordatorio_empleados FOR SELECT USING (true);
CREATE POLICY "emp_write"  ON recordatorio_empleados FOR ALL    USING (auth.uid() IS NOT NULL);

-- recordatorio_usuarios
DROP POLICY IF EXISTS "ru_select" ON recordatorio_usuarios;
DROP POLICY IF EXISTS "ru_write"  ON recordatorio_usuarios;
CREATE POLICY "ru_select" ON recordatorio_usuarios FOR SELECT USING (true);
CREATE POLICY "ru_write"  ON recordatorio_usuarios FOR ALL    USING (auth.uid() IS NOT NULL);
