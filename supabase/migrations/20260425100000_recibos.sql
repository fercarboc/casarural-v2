-- ── Secuencia de número de recibo ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generar_numero_recibo(p_property_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year  int;
  v_seq   int;
BEGIN
  v_year := EXTRACT(YEAR FROM now());
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero_recibo, '-', 3) AS int)
  ), 0) + 1
  INTO v_seq
  FROM recibos
  WHERE property_id = p_property_id
    AND numero_recibo LIKE 'REC-' || v_year || '-%';

  RETURN 'REC-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

-- ── Tabla recibos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recibos (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id          uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  numero_recibo        text        NOT NULL,
  tipo                 text        NOT NULL CHECK (tipo IN ('RESERVA','FIANZA','PAGO_MENSUAL','OTRO')),
  -- Origen
  reserva_id           uuid        REFERENCES reservas(id),
  rental_id            uuid        REFERENCES rentals(id),
  rental_payment_id    uuid        REFERENCES rental_payments(id),
  -- Datos cliente
  nombre_cliente       text        NOT NULL,
  nif_cliente          text,
  direccion_cliente    text,
  email_cliente        text,
  -- Importes
  concepto             text        NOT NULL,
  base_imponible       numeric(12,2) NOT NULL,
  iva_porcentaje       numeric(5,2)  NOT NULL DEFAULT 10,
  iva_importe          numeric(12,2) NOT NULL,
  total                numeric(12,2) NOT NULL,
  -- Fechas
  fecha_emision        date        NOT NULL DEFAULT CURRENT_DATE,
  fecha_pago           date,
  -- Estado: fianza tiene ACTIVA/DEVUELTA, el resto PENDIENTE/PAGADO
  estado               text        NOT NULL DEFAULT 'PENDIENTE'
                                   CHECK (estado IN ('PENDIENTE','PAGADO','ACTIVA','DEVUELTA','ANULADO')),
  -- Facturación
  puede_facturarse     boolean     NOT NULL DEFAULT true,  -- false para FIANZA
  factura_id           uuid        REFERENCES facturas(id),
  -- Extra
  notas                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recibos_property    ON recibos(property_id);
CREATE INDEX IF NOT EXISTS idx_recibos_reserva     ON recibos(reserva_id) WHERE reserva_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recibos_rental      ON recibos(rental_id)  WHERE rental_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recibos_tipo_estado ON recibos(property_id, tipo, estado);

-- ── updated_at automático ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_recibos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_recibos_updated_at ON recibos;
CREATE TRIGGER trg_recibos_updated_at
  BEFORE UPDATE ON recibos
  FOR EACH ROW EXECUTE FUNCTION update_recibos_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_recibos"
  ON recibos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_recibos"
  ON recibos FOR ALL TO authenticated
  USING (
    property_id IN (
      SELECT property_id FROM property_users WHERE user_id = auth.uid()
    )
  );
