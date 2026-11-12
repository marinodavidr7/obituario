import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function guardarArchivo(file: File | null): Promise<string | null> {
  if (!file || !(file instanceof File) || file.size === 0) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  // 1. Si Supabase está disponible, subir a Supabase Storage
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.storage
        .from("panteon-media")
        .upload(`uploads/${fileName}`, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || (ext === "gif" ? "image/gif" : `image/${ext}`),
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
    reader.readAsDataURL(file);
  });
}

export async function guardarImagen(file: File | null): Promise<string | null> {
  return guardarArchivo(file);
}
