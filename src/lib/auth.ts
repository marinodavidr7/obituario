import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const ADMIN_STORAGE_KEY = "panteon_admin_session_v1";

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const s = localStorage.getItem(ADMIN_STORAGE_KEY);
    return Boolean(s && s === "authenticated");
  } catch {
    return false;
  }
}

export function translateAuthError(err?: string): string {
  if (!err) return "Credenciales de acceso no válidas.";
  if (err.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos. Por favor verifica tus datos.";
  }
  if (err.includes("Email not confirmed")) {
    return "El correo aún no ha sido confirmado en Supabase. Confírmalo en tu dashboard o ejecuta el script en SQL Editor.";
  }
  return err;
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Supabase Auth (Cifrado seguro con bcrypt nativo de Supabase)
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (!error && data?.session) {
        localStorage.setItem(ADMIN_STORAGE_KEY, "authenticated");
        window.dispatchEvent(new Event("panteon:auth-changed"));
        return { ok: true };
      }

      if (error) {
        // Si falló por confirmación o credenciales, devolver mensaje claro
        return { ok: false, error: translateAuthError(error.message) };
      }
    } catch (e: any) {
      console.warn("[Auth] Error conectando a Supabase:", e);
      return { ok: false, error: "Error conectando al servidor de autenticación." };
    }
  }

  // 2. Respaldo local de emergencia si Supabase estuviera sin conexión
  const envPass = (import.meta.env.VITE_ADMIN_PASSWORD as string) || "panteon2026";
  if (
    cleanEmail === "davidsbusinessgroup@gmail.com" &&
    (cleanPass === "@David2026" || cleanPass === envPass)
  ) {
    localStorage.setItem(ADMIN_STORAGE_KEY, "authenticated");
    window.dispatchEvent(new Event("panteon:auth-changed"));
    return { ok: true };
  }

  return { ok: false, error: "Correo o contraseña no autorizados." };
}

export async function logoutAdmin(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
  window.dispatchEvent(new Event("panteon:auth-changed"));
}

export function useAdmin(): boolean {
  const [authed, setAuthed] = useState<boolean>(() => isAdmin());

  useEffect(() => {
    const handler = () => setAuthed(isAdmin());
    window.addEventListener("panteon:auth-changed", handler);

    // Escuchar cambios de sesión de Supabase Auth
    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          localStorage.setItem(ADMIN_STORAGE_KEY, "authenticated");
          setAuthed(true);
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          setAuthed(false);
        }
      });

      return () => {
        window.removeEventListener("panteon:auth-changed", handler);
        subscription.unsubscribe();
      };
    }

    return () => window.removeEventListener("panteon:auth-changed", handler);
  }, []);

  return authed;
}
