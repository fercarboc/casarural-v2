import { useEffect, useState } from "react";
import PhotoCard, { UnitPhoto } from "./PhotoCard";
import UploadArea from "./UploadArea";
import { getFunctionsBaseUrl } from "../../integrations/supabase/functions";

interface Props {
  unidadId: string;
  accessToken: string;
}

const FUNCTIONS_BASE_URL = getFunctionsBaseUrl();

export default function UnitPhotoManager({ unidadId, accessToken }: Props) {
  const [photos, setPhotos] = useState<UnitPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const loadPhotos = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${FUNCTIONS_BASE_URL}/admin_unit_photos_list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          unidad_id: unidadId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("admin_unit_photos_list error:", res.status, text);
        throw new Error(`Error ${res.status} cargando fotos`);
      }

      const data = await res.json();

      if (data.success) {
        setPhotos(data.photos || []);
      } else {
        console.error("Error API:", data);
        throw new Error(data?.error || "Error cargando fotos");
      }
    } catch (err) {
      console.error("Error loading photos", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unidadId && accessToken) {
      loadPhotos();
    }
  }, [unidadId, accessToken]);

  const handleUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("unidad_id", unidadId);
      formData.append("file", file);

      const res = await fetch(`${FUNCTIONS_BASE_URL}/admin_unit_photo_upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("admin_unit_photo_upload error:", res.status, text);
        throw new Error(`Error ${res.status} subiendo imagen`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data?.error || "Error subiendo imagen");
      }

      await loadPhotos();
    } catch (err) {
      console.error(err);
      alert("Error inesperado subiendo la imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("¿Eliminar imagen?")) return;

    setProcessingId(photoId);

    try {
      const res = await fetch(`${FUNCTIONS_BASE_URL}/admin_unit_photo_delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          photo_id: photoId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("admin_unit_photo_delete error:", res.status, text);
        throw new Error(`Error ${res.status} eliminando imagen`);
      }

      await loadPhotos();
    } catch (err) {
      console.error(err);
      alert("Error eliminando imagen");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSetPortada = async (photoId: string) => {
    setProcessingId(photoId);

    try {
      const res = await fetch(`${FUNCTIONS_BASE_URL}/admin_unit_photo_set_portada`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          photo_id: photoId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("admin_unit_photo_set_portada error:", res.status, text);
        throw new Error(`Error ${res.status} cambiando portada`);
      }

      await loadPhotos();
    } catch (err) {
      console.error(err);
      alert("Error cambiando portada");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (id: string) => {
    if (id !== dragOverId) {
      setDragOverId(id);
    }
  };

  const handleDrop = async () => {
    if (!draggedId || !dragOverId || draggedId === dragOverId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const updated = [...photos];

    const fromIndex = updated.findIndex((p) => p.id === draggedId);
    const toIndex = updated.findIndex((p) => p.id === dragOverId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    const normalized = updated.map((photo, index) => ({
      ...photo,
      orden: index,
    }));

    setPhotos(normalized);
    setReordering(true);

    try {
      const res = await fetch(`${FUNCTIONS_BASE_URL}/admin_unit_photo_reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          unidad_id: unidadId,
          photo_ids: normalized.map((p) => p.id),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("admin_unit_photo_reorder error:", res.status, text);
        throw new Error(`Error ${res.status} reordenando imágenes`);
      }

      const data = await res.json();

      if (!data?.success) {
        throw new Error(data?.error || "Error reordenando imágenes");
      }
    } catch (err) {
      console.error(err);
      alert("Error reordenando imágenes");
      await loadPhotos();
    } finally {
      setDraggedId(null);
      setDragOverId(null);
      setReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Fotos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sube imágenes, elimina las que no sirvan, selecciona la portada y
          ordena la galería arrastrando.
        </p>
      </div>

      <UploadArea onUpload={handleUpload} disabled={uploading || reordering} />

      {reordering && (
        <p className="text-sm text-blue-600">Guardando orden...</p>
      )}

      {loading && (
        <p className="text-sm text-slate-500">Cargando imágenes...</p>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              draggable={!uploading && !reordering}
              onDragStart={() => handleDragStart(photo.id)}
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(photo.id);
              }}
              onDrop={handleDrop}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              className={`transition ${
                dragOverId === photo.id ? "scale-[1.02] ring-2 ring-blue-400" : ""
              } ${draggedId === photo.id ? "opacity-50" : ""}`}
            >
              <PhotoCard
                photo={photo}
                onDelete={handleDelete}
                onSetPortada={handleSetPortada}
                deleting={processingId === photo.id}
                settingPortada={processingId === photo.id}
              />
            </div>
          ))}

          {photos.length === 0 && (
            <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No hay imágenes todavía para esta unidad
            </div>
          )}
        </div>
      )}
    </div>
  );
}