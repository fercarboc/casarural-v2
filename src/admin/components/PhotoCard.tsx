import React from "react";

/**
 * Tipo compartido de foto de unidad
 * IMPORTANTE: se exporta para usarlo en UnitPhotoManager
 */
export interface UnitPhoto {
  id: string;
  public_url: string;
  orden: number;
  es_portada: boolean;
}

interface PhotoCardProps {
  photo: UnitPhoto;
  onDelete: (photoId: string) => void;
  onSetPortada: (photoId: string) => void;
  deleting?: boolean;
  settingPortada?: boolean;
}

export default function PhotoCard({
  photo,
  onDelete,
  onSetPortada,
  deleting = false,
  settingPortada = false,
}: PhotoCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* IMAGEN */}
      <div className="relative">
        <img
          src={photo.public_url}
          alt={`Foto unidad ${photo.orden + 1}`}
          className="h-44 w-full object-cover"
        />

        {/* BADGE PORTADA */}
        {photo.es_portada && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow">
            Portada
          </span>
        )}
      </div>

      {/* INFO + ACTIONS */}
      <div className="space-y-3 p-3">

        {/* INFO */}
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Orden #{photo.orden + 1}
          </div>
          <div className="text-xs text-slate-400">
            ID: {photo.id.slice(0, 6)}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">

          {/* BOTÓN PORTADA */}
          <button
            type="button"
            onClick={() => onSetPortada(photo.id)}
            disabled={settingPortada || photo.es_portada}
            className={[
              "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
              photo.es_portada
                ? "cursor-not-allowed border border-amber-300 bg-amber-50 text-amber-700"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
            ].join(" ")}
          >
            {settingPortada
              ? "Actualizando..."
              : photo.es_portada
              ? "Portada"
              : "Hacer portada"}
          </button>

          {/* BOTÓN DELETE */}
          <button
            type="button"
            onClick={() => onDelete(photo.id)}
            disabled={deleting}
            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "..." : "🗑"}
          </button>
        </div>
      </div>
    </div>
  );
}