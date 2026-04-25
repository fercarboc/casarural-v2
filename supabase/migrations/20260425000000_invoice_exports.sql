-- ── invoice_exports: registro de lotes de exportación fiscal ────────────────
CREATE TABLE IF NOT EXISTS invoice_exports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  fecha_desde     date NOT NULL,
  fecha_hasta     date NOT NULL,
  total_facturas  int  NOT NULL DEFAULT 0,
  total_importe   numeric(12,2) NOT NULL DEFAULT 0,
  formato         text NOT NULL CHECK (formato IN ('XML','CSV','AMBOS')),
  xml_url         text,
  csv_url         text,
  estado          text NOT NULL DEFAULT 'GENERANDO'
                       CHECK (estado IN ('GENERANDO','COMPLETADO','ERROR')),
  error_msg       text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── invoice_export_items: trazabilidad de cada factura incluida ───────────────
CREATE TABLE IF NOT EXISTS invoice_export_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id        uuid NOT NULL REFERENCES invoice_exports(id) ON DELETE CASCADE,
  factura_id       uuid NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  numero_factura   text NOT NULL,
  fecha_emision    date NOT NULL,
  nombre_cliente   text NOT NULL,
  nif_cliente      text,
  base_imponible   numeric(12,2) NOT NULL,
  iva_importe      numeric(12,2) NOT NULL,
  total            numeric(12,2) NOT NULL,
  hash_actual      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoice_exports_property
  ON invoice_exports(property_id);

CREATE INDEX IF NOT EXISTS idx_invoice_export_items_export
  ON invoice_export_items(export_id);

-- ── updated_at automático ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_invoice_exports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_exports_updated_at ON invoice_exports;
CREATE TRIGGER trg_invoice_exports_updated_at
  BEFORE UPDATE ON invoice_exports
  FOR EACH ROW EXECUTE FUNCTION update_invoice_exports_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE invoice_exports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_export_items  ENABLE ROW LEVEL SECURITY;

-- service_role (edge functions) tiene acceso total
CREATE POLICY "service_role_all_invoice_exports"
  ON invoice_exports FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_invoice_export_items"
  ON invoice_export_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- admins autenticados acceden sólo a su property
CREATE POLICY "admin_read_invoice_exports"
  ON invoice_exports FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM property_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_read_invoice_export_items"
  ON invoice_export_items FOR SELECT TO authenticated
  USING (
    export_id IN (
      SELECT ie.id FROM invoice_exports ie
      JOIN property_users pu ON pu.property_id = ie.property_id
      WHERE pu.user_id = auth.uid()
    )
  );
