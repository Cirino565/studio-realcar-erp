"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_SOURCE_SIZE = 30 * 1024 * 1024;
const MAX_DIMENSION = 2200;
const TARGET_SIZE = 3 * 1024 * 1024;
const MAX_BATCH_FILES = 20;

type Props = {
  clienteId: number;
  driveConfigurado: boolean;
};

type StatusEnvio = "idle" | "preparando" | "enviando";

type FotoSelecionada = {
  id: string;
  file: File;
  previewUrl: string;
};

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
  const [selectedPhotos, setSelectedPhotos] = useState<FotoSelecionada[]>([]);
  const [status, setStatus] = useState<StatusEnvio>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const previewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  function criarFotoSelecionada(file: File): FotoSelecionada {
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl,
    };
  }

  function revogarPreview(previewUrl: string) {
    if (!previewUrlsRef.current.has(previewUrl)) return;

    URL.revokeObjectURL(previewUrl);
    previewUrlsRef.current.delete(previewUrl);
  }

  function addFiles(files: File[]) {
    setMessage(null);

    const imagens = files.filter((file) => file.type.startsWith("image/"));

    if (imagens.length === 0) {
      setMessage("Selecione arquivos de imagem.");
      return;
    }

    const disponiveis = Math.max(0, MAX_BATCH_FILES - selectedPhotos.length);

    if (disponiveis === 0) {
      setMessage(`O limite por lote e de ${MAX_BATCH_FILES} fotos.`);
      return;
    }

    const novas = imagens
      .slice(0, disponiveis)
      .map(criarFotoSelecionada);

    setSelectedPhotos((current) => [...current, ...novas]);

    if (imagens.length > disponiveis) {
      setMessage(
        `Foram adicionadas ${disponiveis} fotos. O limite por lote e de ${MAX_BATCH_FILES}.`,
      );
    }
  }

  function removeFile(id: string) {
    setSelectedPhotos((current) => {
      const foto = current.find((item) => item.id === id);

      if (foto) {
        revogarPreview(foto.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });

    setMessage(null);
  }

  function clearFiles() {
    setSelectedPhotos((current) => {
      current.forEach((item) => revogarPreview(item.previewUrl));
      return [];
    });

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

    if (selectedPhotos.length === 0) {
      setMessage("Tire uma foto ou escolha imagens da galeria.");
      return;
    }

    const form = event.currentTarget;
    const fotosDoLote = [...selectedPhotos];
    const sucessos = new Set<string>();
    const falhas: Array<{ id: string; erro: string }> = [];

    try {
      for (let index = 0; index < fotosDoLote.length; index += 1) {
        const foto = fotosDoLote[index];

        setProgress({
          current: index + 1,
          total: fotosDoLote.length,
        });

        try {
          setStatus("preparando");

          const preparedFile = await prepareImage(foto.file);
          const formData = new FormData(form);

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
            throw new Error(
              payload?.erro || `Não foi possível enviar ${foto.file.name}.`,
            );
          }

          sucessos.add(foto.id);
        } catch (error) {
          falhas.push({
            id: foto.id,
            erro:
              error instanceof Error
                ? error.message
                : `Falha ao enviar ${foto.file.name}.`,
          });
        }
      }

      if (sucessos.size > 0) {
        router.refresh();
      }

      if (falhas.length === 0) {
        fotosDoLote.forEach((foto) => revogarPreview(foto.previewUrl));
        setSelectedPhotos([]);

        form.reset();

        if (cameraInput.current) cameraInput.current.value = "";
        if (galleryInput.current) galleryInput.current.value = "";

        setMessage(
          fotosDoLote.length === 1
            ? "Foto enviada com segurança para o Google Drive."
            : `${fotosDoLote.length} fotos enviadas com segurança para o Google Drive.`,
        );
      } else {
        setSelectedPhotos((current) =>
          current.filter((foto) => {
            if (!sucessos.has(foto.id)) return true;

            revogarPreview(foto.previewUrl);
            return false;
          }),
        );

        const primeiraFalha = falhas[0]?.erro || "Falha no envio.";

        setMessage(
          `${sucessos.size} de ${fotosDoLote.length} fotos foram enviadas. ` +
            `${falhas.length} permaneceram selecionadas para tentar novamente. ` +
            `Motivo: ${primeiraFalha}`,
        );
      }
    } finally {
      setStatus("idle");
      setProgress({ current: 0, total: 0 });
    }
  }

  const busy = status !== "idle";

  const botaoTexto =
    status === "preparando"
      ? `Preparando ${progress.current} de ${progress.total}...`
      : status === "enviando"
        ? `Enviando ${progress.current} de ${progress.total}...`
        : selectedPhotos.length > 1
          ? `Salvar ${selectedPhotos.length} fotos`
          : "Salvar foto clínica";

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
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) addFiles([file]);

          event.target.value = "";
        }}
      />

      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {selectedPhotos.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedPhotos.length === 1
                  ? "1 foto selecionada"
                  : `${selectedPhotos.length} fotos selecionadas`}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                O título, tipo, procedimento, data e descrição serão aplicados ao lote.
              </p>
            </div>

            {selectedPhotos.length > 1 ? (
              <button
                type="button"
                onClick={clearFiles}
                disabled={busy}
                className="shrink-0 text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50"
              >
                Remover todas
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {selectedPhotos.map((foto, index) => (
              <div
                key={foto.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.previewUrl}
                    alt={`Pré-visualização da foto ${index + 1}`}
                    className="h-full w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => removeFile(foto.id)}
                    disabled={busy}
                    className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full border border-white/80 bg-black/85 text-white shadow-lg transition hover:bg-black disabled:opacity-50"
                    aria-label={`Remover foto ${index + 1}`}
                  >
                    <X size={18} strokeWidth={3} />
                  </button>

                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-slate-950/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="px-2.5 py-2">
                  <p
                    className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                    title={foto.file.name}
                  >
                    {foto.file.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {formatBytes(foto.file.size)}
                  </p>
                </div>
              </div>
            ))}
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
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 z-[300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl sm:left-auto sm:right-4 sm:translate-x-0 ${
            message.includes("com segurança")
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-rose-300 bg-rose-50 text-rose-900"
          }`}
        >
          {message}
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={busy || !driveConfigurado || selectedPhotos.length === 0}
      >
        {busy ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <UploadCloud size={17} />
        )}
        {botaoTexto}
      </Button>
    </form>
  );
}
