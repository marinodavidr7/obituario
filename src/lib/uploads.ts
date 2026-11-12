import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Comprime y optimiza imágenes estáticas (JPG, PNG, WebP) antes de subirlas.
 * IMPORTANTE: Si es un GIF animado, se devuelve intacto para no perder sus fotogramas de animación.
 */
export async function comprimirImagenAntesDeSubir(file: File): Promise<File> {
  const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
  if (isGif || !file.type.startsWith("image/")) {
    return file;
  }

  // Si ya es muy liviana (< 180 KB), no hace falta recomprimir
  if (file.size < 180 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1400;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return resolve(file);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            return resolve(file);
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export async function guardarArchivo(file: File | null): Promise<string | null> {
  if (!file || !(file instanceof File) || file.size === 0) return null;

  // Optimizar automáticamente imágenes pesadas (dejando GIFs intactos)
  const fileToUpload = await comprimirImagenAntesDeSubir(file);

  const ext = fileToUpload.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  // 1. Si Supabase está disponible, subir a Supabase Storage con caché inmutable
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.storage
        .from("panteon-media")
        .upload(`uploads/${fileName}`, fileToUpload, {
          cacheControl: "31536000, immutable",
          upsert: false,
          contentType: fileToUpload.type || (ext === "gif" ? "image/gif" : `image/${ext}`),
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from("panteon-media")
          .getPublicUrl(data.path);
        return publicData.publicUrl;
      }
    } catch (e) {
      console.warn("[Uploads] Falló subida a Supabase, recurriendo a DataURL:", e);
    }
  }

  // 2. Modo Offline / Local: almacenar como DataURL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsDataURL(fileToUpload);
  });
}

export async function guardarImagen(file: File | null): Promise<string | null> {
  return guardarArchivo(file);
}
