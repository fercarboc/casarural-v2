import { useRef, useState } from "react";

interface UploadAreaProps {
  onUpload: (file: File) => Promise<void> | void;
  disabled?: boolean;
}

export default function UploadArea({
  onUpload,
  disabled = false,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file?: File | null) => {
    if (!file || disabled) return;
    await onUpload(file);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        await processFile(file);
      }}
      className={[
        "rounded-2xl border-2 border-dashed p-6 text-center transition",
        dragActive ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-white",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="hidden"
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];

          input.value = "";

          await processFile(file);
        }}
      />

      <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          ⤴
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Subir nueva imagen
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Arrastra una imagen aquí o haz clic para seleccionarla.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Formatos recomendados: JPG, PNG, WEBP · máximo 5 MB
        </div>
      </div>
    </div>
  );
}