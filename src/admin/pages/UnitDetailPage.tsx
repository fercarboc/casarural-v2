 import { useMemo } from "react";
import { useParams } from "react-router-dom";
 
import UnitPhotoManager from "../components/UnitPhotoManager";
import UnitDescriptionForm from "../components/UnitDescriptionForm";

export interface UnitInitialData {
  id: string;
  nombre: string;
  tipo?: string | null;
  capacidad_base?: number | null;
  capacidad_maxima?: number | null;
  num_habitaciones?: number | null;
  num_banos?: number | null;
  superficie_m2?: number | null;
  descripcion_corta?: string | null;
  descripcion_larga?: string | null;
  descripcion_extras?: string | null;
  amenities?: string[] | null;
}

interface UnitDetailPageProps {
  accessToken: string;
  initialData?: UnitInitialData | null;
}

export default function UnitDetailPage({
  accessToken,
  initialData,
}: UnitDetailPageProps) {
  const { id } = useParams<{ id: string }>();

  const unidadId = useMemo(() => id ?? initialData?.id ?? "", [id, initialData]);

  if (!unidadId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        No se ha podido resolver el ID de la unidad.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">
              {initialData?.nombre || "Editar unidad"}
            </h1>
            <p className="text-sm text-slate-500">
              Gestiona fotos, descripción y contenido visible en la web pública.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoPill
              label="Tipo"
              value={initialData?.tipo || "—"}
            />
            <InfoPill
              label="Capacidad"
              value={
                initialData?.capacidad_base || initialData?.capacidad_maxima
                  ? `${initialData?.capacidad_base ?? "—"} - ${initialData?.capacidad_maxima ?? "—"}`
                  : "—"
              }
            />
            <InfoPill
              label="Habitaciones"
              value={
                initialData?.num_habitaciones != null
                  ? String(initialData.num_habitaciones)
                  : "—"
              }
            />
            <InfoPill
              label="Baños"
              value={
                initialData?.num_banos != null ? String(initialData.num_banos) : "—"
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <UnitPhotoManager unidadId={unidadId} accessToken={accessToken} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <UnitDescriptionForm
            unidadId={unidadId}
            accessToken={accessToken}
            initialValues={{
              descripcion_corta: initialData?.descripcion_corta ?? "",
              descripcion_larga: initialData?.descripcion_larga ?? "",
              descripcion_extras: initialData?.descripcion_extras ?? "",
              amenities: initialData?.amenities ?? [],
            }}
          />
        </section>
      </div>
    </div>
  );
}

interface InfoPillProps {
  label: string;
  value: string;
}

function InfoPill({ label, value }: InfoPillProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}