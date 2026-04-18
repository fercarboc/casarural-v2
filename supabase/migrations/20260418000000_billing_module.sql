-- ============================================================
-- MÓDULO DE FACTURACIÓN FISCAL — VeriFactu Ready
-- Evoluciona el sistema de facturas hacia inmutabilidad real,
-- trazabilidad completa y preparación para envío AEAT.
-- ============================================================

-- ── 1. Extender tabla facturas ─────────────────────────────────────────────────

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS tipo_factura     text        NOT NULL DEFAULT 'ORDINARIA'
    CHECK (tipo_factura IN ('ORDINARIA', 'RECTIFICATIVA')),
  ADD COLUMN IF NOT EXISTS bloqueada        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hash_actual      text,
  ADD COLUMN IF NOT EXISTS hash_anterior    text,
  ADD COLUMN IF NOT EXISTS factura_rectificada_id uuid REFERENCES facturas(id),
  ADD COLUMN IF NOT EXISTS motivo_rectificacion text,
  ADD COLUMN IF NOT EXISTS estado_aeat      text        NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado_aeat IN ('PENDIENTE', 'PREPARADA', 'ENVIADA', 'ERROR', 'NO_APLICA')),
  ADD COLUMN IF NOT EXISTS enviado_aeat_at  timestamptz,
  ADD COLUMN IF NOT EXISTS aeat_response    jsonb,
  ADD COLUMN IF NOT EXISTS verifactu_payload jsonb,
  ADD COLUMN IF NOT EXISTS email_cliente    text,
  ADD COLUMN IF NOT EXISTS pago_id         uuid,
  ADD COLUMN IF NOT EXISTS fecha_operacion  date,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

-- Añadir RECTIFICADA al check de estado si tiene constraint
-- (se hace con DO para tolerar que no exista el constraint)
DO $$
BEGIN
  ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_estado_check;
  ALTER TABLE facturas
    ADD CONSTRAINT facturas_estado_check
    CHECK (estado IN ('EMITIDA', 'ENVIADA', 'ANULADA', 'RECTIFICADA'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 2. Tabla de eventos de auditoría ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS factura_eventos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id   uuid        NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  property_id  uuid        NOT NULL,
  tipo_evento  text        NOT NULL,
  -- Valores: FACTURA_EMITIDA | PDF_GENERADO | EMAIL_ENVIADO | REENVIO_EMAIL |
  --          RECTIFICATIVA_EMITIDA | PREPARADA_AEAT | ENVIADA_AEAT | ERROR_AEAT |
  --          ESTADO_CAMBIADO
  descripcion  text,
  payload      jsonb,
  user_id      uuid,          -- null = sistema (webhook, edge function)
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Tabla de lotes AEAT ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lotes_aeat (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid        NOT NULL,
  estado          text        NOT NULL DEFAULT 'PREPARADO'
    CHECK (estado IN ('PREPARADO', 'ENVIADO', 'ERROR', 'PARCIAL')),
  facturas_ids    uuid[]      NOT NULL DEFAULT '{}',
  num_facturas    integer     NOT NULL DEFAULT 0,
  payload         jsonb,       -- payload estructurado para AEAT / VeriFactu
  respuesta_aeat  jsonb,
  error_msg       text,
  enviado_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Función: generar número de factura ─────────────────────────────────────

CREATE OR REPLACE FUNCTION generar_numero_factura(
  p_property_id  uuid,
  p_serie        text DEFAULT 'FAC'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year  integer;
  v_count integer;
  v_seq   text;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;

  SELECT COUNT(*) INTO v_count
  FROM facturas
  WHERE property_id = p_property_id
    AND tipo_factura = (CASE WHEN p_serie = 'FAC' THEN 'ORDINARIA' ELSE 'RECTIFICATIVA' END)
    AND EXTRACT(YEAR FROM fecha_emision) = v_year;

  v_seq := LPAD((v_count + 1)::text, 4, '0');
  RETURN p_serie || '-' || v_year || '-' || v_seq;
END;
$$;

-- ── 5. Trigger: inmutabilidad de facturas bloqueadas ──────────────────────────

CREATE OR REPLACE FUNCTION trg_factura_bloqueada_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo aplica si la factura ya estaba bloqueada
  IF OLD.bloqueada IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Campos fiscales que NO se pueden cambiar en una factura bloqueada
  IF (NEW.base_imponible    IS DISTINCT FROM OLD.base_imponible)    OR
     (NEW.iva_porcentaje    IS DISTINCT FROM OLD.iva_porcentaje)    OR
     (NEW.total             IS DISTINCT FROM OLD.total)             OR
     (NEW.nombre            IS DISTINCT FROM OLD.nombre)            OR
     (NEW.nif               IS DISTINCT FROM OLD.nif)               OR
     (NEW.direccion         IS DISTINCT FROM OLD.direccion)         OR
     (NEW.fecha_emision     IS DISTINCT FROM OLD.fecha_emision)     OR
     (NEW.reserva_id        IS DISTINCT FROM OLD.reserva_id)        OR
     (NEW.property_id       IS DISTINCT FROM OLD.property_id)       OR
     (NEW.tipo_factura      IS DISTINCT FROM OLD.tipo_factura)      OR
     (NEW.factura_rectificada_id IS DISTINCT FROM OLD.factura_rectificada_id) OR
     (NEW.hash_actual       IS DISTINCT FROM OLD.hash_actual)       OR
     (NEW.hash_anterior     IS DISTINCT FROM OLD.hash_anterior)     OR
     (NEW.bloqueada         IS DISTINCT FROM OLD.bloqueada)
  THEN
    RAISE EXCEPTION 'FACTURA_BLOQUEADA: los campos fiscales de esta factura son inmutables (id: %)', OLD.id
      USING ERRCODE = 'P0001';
  END IF;

  -- No se puede anular directamente una factura bloqueada;
  -- hay que emitir una rectificativa.
  IF (NEW.estado IS DISTINCT FROM OLD.estado) AND NEW.estado = 'ANULADA' THEN
    RAISE EXCEPTION 'FACTURA_BLOQUEADA: para cancelar una factura fiscal emite una rectificativa (id: %)', OLD.id
      USING ERRCODE = 'P0002';
  END IF;

  -- Campos permitidos: estado (EMITIDA→ENVIADA→RECTIFICADA), pdf_url,
  --                    estado_aeat, enviado_aeat_at, aeat_response,
  --                    verifactu_payload, email_cliente, updated_at, motivo_rectificacion
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factura_bloqueada ON facturas;
CREATE TRIGGER trg_factura_bloqueada
  BEFORE UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION trg_factura_bloqueada_check();

-- ── 6. Trigger: actualizar updated_at automáticamente ─────────────────────────

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_facturas_updated_at ON facturas;
CREATE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_lotes_aeat_updated_at ON lotes_aeat;
CREATE TRIGGER trg_lotes_aeat_updated_at
  BEFORE UPDATE ON lotes_aeat
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_updated_at();

-- ── 7. Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_facturas_property_tipo
  ON facturas (property_id, tipo_factura);

CREATE INDEX IF NOT EXISTS idx_facturas_estado_aeat
  ON facturas (property_id, estado_aeat)
  WHERE bloqueada = true;

CREATE INDEX IF NOT EXISTS idx_facturas_rectificada
  ON facturas (factura_rectificada_id)
  WHERE factura_rectificada_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_factura_eventos_factura
  ON factura_eventos (factura_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_factura_eventos_property
  ON factura_eventos (property_id, tipo_evento, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lotes_aeat_property
  ON lotes_aeat (property_id, estado, created_at DESC);

-- ── 8. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE factura_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_aeat      ENABLE ROW LEVEL SECURITY;

-- factura_eventos: solo acceso via service_role (Edge Functions)
-- El frontend lee solo a través de funciones controladas
DROP POLICY IF EXISTS "Service role full access factura_eventos" ON factura_eventos;
CREATE POLICY "Service role full access factura_eventos"
  ON factura_eventos FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read own property eventos" ON factura_eventos;
CREATE POLICY "Admins read own property eventos"
  ON factura_eventos FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM property_users WHERE user_id = auth.uid()
    )
  );

-- lotes_aeat
DROP POLICY IF EXISTS "Service role full access lotes_aeat" ON lotes_aeat;
CREATE POLICY "Service role full access lotes_aeat"
  ON lotes_aeat FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read own property lotes" ON lotes_aeat;
CREATE POLICY "Admins read own property lotes"
  ON lotes_aeat FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM property_users WHERE user_id = auth.uid()
    )
  );

-- ── 9. Comentarios documentales ──────────────────────────────────────────────

COMMENT ON COLUMN facturas.bloqueada IS
  'true = factura fiscal inmutable. Solo campos no-fiscales pueden cambiar.';
COMMENT ON COLUMN facturas.hash_actual IS
  'SHA-256(property_id|numero_factura|fecha_emision|nif|total|hash_anterior). VeriFactu.';
COMMENT ON COLUMN facturas.hash_anterior IS
  'hash_actual de la factura anterior de la misma serie en esta property.';
COMMENT ON COLUMN facturas.estado_aeat IS
  'PENDIENTE|PREPARADA|ENVIADA|ERROR|NO_APLICA — ciclo de vida AEAT/VeriFactu.';
COMMENT ON COLUMN facturas.verifactu_payload IS
  'Payload estructurado listo para envío AEAT (VeriFactu formato JSON→XML).';
COMMENT ON TABLE factura_eventos IS
  'Log de auditoría inmutable de acciones sobre facturas.';
COMMENT ON TABLE lotes_aeat IS
  'Agrupación de facturas para envío batch a AEAT/VeriFactu.';
