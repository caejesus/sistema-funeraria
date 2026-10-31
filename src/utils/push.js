import { supabase } from "../lib/supabaseClient";

// Chave PÚBLICA VAPID (a privada fica só nos secrets do Supabase)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export function isIOS() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function suportaPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("Erro ao registrar service worker:", err));
  });
}

function base64ParaUint8(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Estados possíveis:
// "sem_suporte" | "iphone_instalar" | "sem_chave" | "bloqueado" | "ativo" | "inativo"
export async function getEstadoNotificacoes() {
  if (isIOS() && !isStandalone()) return "iphone_instalar";
  if (!suportaPush()) return "sem_suporte";
  if (!VAPID_PUBLIC_KEY) return "sem_chave";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission !== "granted") return "inativo";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub ? "ativo" : "inativo";
  } catch {
    return "inativo";
  }
}

async function salvarInscricao(sub, session) {
  const json = sub.toJSON();
  const { error } = await supabase.from("push_inscricoes").upsert(
    [
      {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh || "",
        auth: json.keys?.auth || "",
        usuario: session?.name || "",
        perfil: session?.role || "",
        user_agent: navigator.userAgent.slice(0, 300),
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function ativarNotificacoes(session) {
  if (!suportaPush()) throw new Error("Este navegador não suporta notificações.");
  if (!VAPID_PUBLIC_KEY) throw new Error("Chave de notificação não configurada no sistema.");

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error("Permissão de notificação negada.");

  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ParaUint8(VAPID_PUBLIC_KEY),
    });
  }
  await salvarInscricao(sub, session);
}

// Mantém a inscrição associada ao usuário logado (ex.: outro motorista entrou no mesmo celular)
export async function sincronizarInscricao(session) {
  try {
    if (!suportaPush() || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) await salvarInscricao(sub, session);
  } catch (err) {
    console.error("Erro ao sincronizar inscrição de notificação:", err);
  }
}
