-- ─── Fianza estado en rentals ──────────────────────────────────────────────────
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS fianza_estado TEXT NOT NULL DEFAULT 'SIN_FIANZA';
-- SIN_FIANZA | ACTIVA | PENDIENTE_DEVOLUCION | DEVUELTA | DEVUELTA_PARCIAL

-- Actualizar registros existentes
UPDATE rentals SET fianza_estado = 'ACTIVA'
  WHERE fianza > 0 AND fianza_cobrada = true AND (fianza_devuelta = false OR fianza_devuelta IS NULL)
  AND estado IN ('ACTIVO','RENOVADO','APROBADO','EN_REVISION','SOLICITUD');

UPDATE rentals SET fianza_estado = 'DEVUELTA'
  WHERE fianza > 0 AND fianza_devuelta = true;

-- ─── Tabla rental_payments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  rental_id           UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  tipo                TEXT NOT NULL,      -- 'MENSUALIDAD' | 'DEVOLUCION_FIANZA'
  concepto            TEXT NOT NULL,
  importe             NUMERIC(10,2) NOT NULL,
  fecha_vencimiento   DATE NOT NULL,
  fecha_pago          DATE,
  estado              TEXT NOT NULL DEFAULT 'PENDIENTE',  -- 'PENDIENTE' | 'PAGADO' | 'VENCIDO'
  descuento_importe   NUMERIC(10,2),
  descuento_concepto  TEXT,
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rental_payments' AND policyname = 'rental_payments_property_users'
  ) THEN
    CREATE POLICY "rental_payments_property_users" ON rental_payments
      FOR ALL TO authenticated
      USING (property_id IN (SELECT property_id FROM property_users WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rental_payments_rental_id ON rental_payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_property_fecha ON rental_payments(property_id, fecha_vencimiento);
