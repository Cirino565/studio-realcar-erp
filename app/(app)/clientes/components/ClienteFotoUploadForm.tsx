"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_SOURCE_SIZE = 30 * 1024 * 1024;
const MAX_DIMENSION = 2200;
const TARGET_SIZE = 3 * 1024 * 1024;

type Props = {
  clienteId: number;
  driveConfigurado: boolean;
};

type StatusEnvio = "idle" | "preparando" | "enviando";

function dateInputValue() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir esta imagem no aparelho."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível preparar a imagem."));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function prepareImage(file: File) {
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error("A imagem original ultrapassa 30 MB.");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Não foi possível preparar a imagem neste navegador.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.86;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > TARGET_SIZE && quality > 0.62) {
    quality -= 0.06;
    blob = await canvasToBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-clinica";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function ClienteFotoUploadForm({ clienteId, driveConfigurado }: Props) {
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusEnvio>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(file: File | null) {
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setMessage(null);
  }

  function clearFile() {
    selectFile(null);
    if (cameraInput.current) cameraInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!driveConfigurado) {
      setMessage("Configure a integração com o Google Drive antes do primeiro envio.");
      return;
    }

    if (!selectedFile) {
      setMessage("Tire uma foto ou escolha uma imagem da galeria.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      setStatus("preparando");
      const preparedFile = await prepareImage(selectedFile);
      formData.set("arquivo", preparedFile, preparedFile.name);
      setStatus("enviando");

      const response = await fetch("/api/clientes/fotos", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { erro?: string; ok?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.erro || "Não foi possível enviar a foto.");
      }

      form.reset();
      clearFile();
      setMessage("Foto enviada com segurança para o Google Drive.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao enviar a foto.");
    } finally {
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <form
      onSubmit={handleSubmit}
      className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <input type="hidden" name="clienteId" value={clienteId} />

      {!driveConfigurado ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
          A integração com o Google Drive está pronta no código, mas ainda precisa das credenciais no Railway.
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
          As imagens serão reduzidas no aparelho, enviadas para uma pasta privada e exibidas apenas para usuários autorizados.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !driveConfigurado}
          onClick={() => cameraInput.current?.click()}
          className="h-12"
        >
          <Camera size={18} />
          Tirar foto
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={busy || !driveConfigurado}
          onClick={() => galleryInput.current?.click()}
          className="h-12"
        >
          <ImagePlus size={18} />
          Galeria
        </Button>
      </div>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      {selectedFile && previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/60">
          <div className="relative aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Pré-visualização da foto selecionada"
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              onClick={clearFile}
              disabled={busy}
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-slate-950/80 text-white shadow-lg transition hover:bg-slate-950 disabled:opacity-50"
              aria-label="Remover foto selecionada"
            >
              <X size={18} />
            </button>
          </div>
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
            {selectedFile.name} • {formatBytes(selectedFile.size)}
          </div>
        </div>
      ) : null}

      <label className="space-y-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Título</span>
        <input
          name="titulo"
          required
          maxLength={160}
          placeholder="Ex: Antes da limpeza de pele"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
        />
      </label>

      <label className="space-y-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo</span>
        <select
          name="tipo"
          defaultValue="Evolução"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
        >
          <option>Antes</option>
          <option>Depois</option>
          <option>Evolução</option>
          <option>Intercorrência</option>
          <option>Outro</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Procedimento</span>
        <input
          name="procedimento"
          maxLength={160}
          placeholder="Ex: Limpeza de pele"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
        />
      </label>

      <label className="space-y-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Data</span>
        <input
          name="dataRegistro"
          type="date"
          defaultValue={dateInputValue()}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
        />
      </label>

      <label className="space-y-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Descrição</span>
        <textarea
          name="descricao"
          maxLength={2000}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
        />
      </label>

      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
          {message}
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={busy || !driveConfigurado || !selectedFile}
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}
        {status === "preparando"
          ? "Preparando imagem..."
          : status === "enviando"
            ? "Enviando ao Drive..."
            : "Salvar foto clínica"}
      </Button>
    </form>
  );
}
