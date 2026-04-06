import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";

interface UnitDescriptionFormProps {
  unidadId: string;
  accessToken?: string;
  initialValues?: {
    descripcion_corta?: string;
    descripcion_larga?: string;
    descripcion_extras?: string;
    amenities?: string[];
  };
}

interface FormState {
  descripcion_corta: string;
  descripcion_larga: string;
  descripcion_extras: string;
  amenities: string[];
}

const AMENITIES_SUGERIDOS = [
  "WiFi",
  "Piscina",
  "Chimenea",
  "Parking",
  "Barbacoa",
  "Jardín",
  "Terraza",
  "Cocina equipada",
  "Lavadora",
  "Aire acondicionado",
  "Calefacción",
  "Vistas a la montaña",
];

export default function UnitDescriptionForm({
  unidadId,
  initialValues,
}: UnitDescriptionFormProps) {
  const initialForm = useMemo<FormState>(
    () => ({
      descripcion_corta: initialValues?.descripcion_corta ?? "",
      descripcion_larga: initialValues?.descripcion_larga ?? "",
      descripcion_extras: initialValues?.descripcion_extras ?? "",
      amenities: initialValues?.amenities ?? [],
    }),
    [initialValues]
  );

  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [customAmenity, setCustomAmenity] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const toggleAmenity = (value: string) => {
    setForm((prev) => {
      const exists = prev.amenities.includes(value);

      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((item) => item !== value)
          : [...prev.amenities, value],
      };
    });
  };

  const addCustomAmenity = () => {
    const value = customAmenity.trim();

    if (!value) return;

    if (form.amenities.includes(value)) {
      setCustomAmenity("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      amenities: [...prev.amenities, value],
    }));

    setCustomAmenity("");
  };

  const removeAmenity = (value: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((item) => item !== value),
    }));
  };

  const handleChange = (
    field: keyof Omit<FormState, "amenities">,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "admin_unit_update_content",
        {
          body: {
            unidad_id: unidadId,
            descripcion_corta: form.descripcion_corta.trim() || null,
            descripcion_larga: form.descripcion_larga.trim() || null,
            descripcion_extras: form.descripcion_extras.trim() || null,
            amenities: form.amenities,
          },
        }
      );

      console.log("admin_unit_update_content data:", data);
      console.log("admin_unit_update_content error:", error);

      if (error) {
        throw new Error(error.message || "No se pudo guardar la unidad");
      }

      if (!data?.success) {
        throw new Error(data?.error || "No se pudo guardar la unidad");
      }

      setMessage("Contenido guardado correctamente.");
    } catch (error) {
      console.error("Error guardando contenido:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Error guardando el contenido de la unidad."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-100">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Descripción</h2>
        <p className="mt-1 text-sm text-slate-400">
          Este contenido se mostrará en el listado público, la ficha de la unidad
          y el motor de reservas.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-900/40 bg-[#0c1c35] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Descripción corta
          </label>
          <input
            type="text"
            value={form.descripcion_corta}
            onChange={(e) => handleChange("descripcion_corta", e.target.value)}
            maxLength={160}
            placeholder="Ej. Apartamento acogedor con vistas al valle"
            className="w-full rounded-xl border border-cyan-900/50 bg-[#132743] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-700/70 focus:ring-2 focus:ring-cyan-900/40"
          />
          <div className="text-xs text-slate-500">
            {form.descripcion_corta.length}/160
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900/40 bg-[#0c1c35] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Descripción larga
          </label>
          <textarea
            value={form.descripcion_larga}
            onChange={(e) => handleChange("descripcion_larga", e.target.value)}
            rows={7}
            placeholder="Describe la unidad, el entorno, la distribución, el estilo y lo que la hace especial."
            className="w-full rounded-xl border border-cyan-900/50 bg-[#132743] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-700/70 focus:ring-2 focus:ring-cyan-900/40"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900/40 bg-[#0c1c35] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Extras / Qué incluye / Normas
          </label>
          <textarea
            value={form.descripcion_extras}
            onChange={(e) => handleChange("descripcion_extras", e.target.value)}
            rows={5}
            placeholder="Ej. Incluye ropa de cama, toallas, cocina equipada. No se admiten fiestas. Check-in desde las 16:00."
            className="w-full rounded-xl border border-cyan-900/50 bg-[#132743] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-700/70 focus:ring-2 focus:ring-cyan-900/40"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900/40 bg-[#0c1c35] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-200">
              Amenities / Características
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Marca los servicios principales y añade otros si hace falta.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {AMENITIES_SUGERIDOS.map((item) => {
              const active = form.amenities.includes(item);

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleAmenity(item)}
                  className={[
                    "rounded-full border px-3 py-2 text-sm transition",
                    active
                      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                      : "border-cyan-900/50 bg-[#132743] text-slate-300 hover:border-cyan-700/60 hover:bg-[#18304f]",
                  ].join(" ")}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={customAmenity}
              onChange={(e) => setCustomAmenity(e.target.value)}
              placeholder="Añadir característica personalizada"
              className="flex-1 rounded-xl border border-cyan-900/50 bg-[#132743] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-700/70 focus:ring-2 focus:ring-cyan-900/40"
            />
            <button
              type="button"
              onClick={addCustomAmenity}
              className="rounded-xl border border-cyan-700/50 bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/25"
            >
              Añadir
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.amenities.length === 0 ? (
              <span className="text-sm text-slate-500">
                No hay amenities seleccionados.
              </span>
            ) : (
              form.amenities.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-900/50 bg-[#132743] px-3 py-2 text-sm text-slate-200"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeAmenity(item)}
                    className="text-slate-500 transition hover:text-red-400"
                    aria-label={`Eliminar ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-cyan-900/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-400">
          Guarda antes de salir para no perder cambios.
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span
              className={`text-sm ${
                message.toLowerCase().includes("error")
                  ? "text-red-400"
                  : "text-emerald-400"
              }`}
            >
              {message}
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl border border-cyan-700/50 bg-cyan-500/15 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar contenido"}
          </button>
        </div>
      </div>
    </div>
  );
}