// Edge Function: notificar-saidas
// Chamada a cada minuto pelo pg_cron. Envia notificações push para os celulares inscritos:
//   1. quando o atendimento lança um serviço novo;
//   2. 30 minutos antes de uma saída agendada (ou assim que ficar atrasada).
// Secrets necessários (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.
// Publicar com "Verify JWT" DESLIGADO (o agendador chama sem token).

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const AVISO_MINUTOS = 30;
const FUSO = "America/Manaus";

const TIPOS: Record<string, string> = {
  buscar_flores: "BUSCAR FLORES",
  entrega_esquife: "ENTREGA DE ESQUIFE",
  retirada_esquife: "RETIRADA DE ESQUIFE",
  translado: "TRANSLADO",
  avulsa: "SAÍDA AVULSA",
};

type Saida = {
  id: string;
  tipo: string;
  falecido: string;
  local_tipo: string;
  local_ident: string;
  destino: string;
  agendado_para: string | null;
};

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
}

function quando(iso: string) {
  const d = new Date(iso);
  const dia = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: FUSO });
  const hoje = new Date();
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (dia(d) === dia(hoje)) return `hoje ${hora(iso)}`;
  if (dia(d) === dia(amanha)) return `amanhã ${hora(iso)}`;
  return `${d.toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" })} ${hora(iso)}`;
}

function detalhes(s: Saida) {
  const partes = [
    s.falecido,
    [s.local_tipo, s.local_ident].filter(Boolean).join(" – "),
    s.destino ? `Destino: ${s.destino}` : "",
  ].filter(Boolean);
  return partes.join(" · ");
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const publica = Deno.env.get("VAPID_PUBLIC_KEY");
  const privada = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publica || !privada) {
    return Response.json({ ok: false, erro: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configurados" }, { status: 500 });
  }
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:contato@gruposaofrancisco.com.br", publica, privada);

  const agora = Date.now();
  const limite = new Date(agora + AVISO_MINUTOS * 60 * 1000).toISOString();
  const mensagens: { title: string; body: string; tag: string }[] = [];

  // 1. Lembretes de saídas agendadas (reserva as linhas marcando como enviadas, evita duplicar)
  const { data: lembretes, error: e1 } = await supabase
    .from("frota_saidas")
    .update({ push_aviso_enviado: true, push_novo_enviado: true })
    .eq("status", "aguardando")
    .eq("push_aviso_enviado", false)
    .not("agendado_para", "is", null)
    .lte("agendado_para", limite)
    .select("id, tipo, falecido, local_tipo, local_ident, destino, agendado_para");
  if (e1) console.error("Erro lembretes:", e1);

  for (const s of (lembretes || []) as Saida[]) {
    const atrasada = new Date(s.agendado_para!).getTime() < agora;
    mensagens.push({
      title: atrasada ? `ATRASADA: ${TIPOS[s.tipo] || s.tipo}` : `Saída às ${hora(s.agendado_para!)}: ${TIPOS[s.tipo] || s.tipo}`,
      body: detalhes(s) || "Abra o sistema para assumir.",
      tag: `saida-${s.id}`,
    });
  }

  // 2. Serviços novos lançados pelo atendimento
  const { data: novos, error: e2 } = await supabase
    .from("frota_saidas")
    .update({ push_novo_enviado: true })
    .eq("status", "aguardando")
    .eq("push_novo_enviado", false)
    .select("id, tipo, falecido, local_tipo, local_ident, destino, agendado_para");
  if (e2) console.error("Erro novos:", e2);

  for (const s of (novos || []) as Saida[]) {
    mensagens.push({
      title: s.agendado_para
        ? `Novo serviço (${quando(s.agendado_para)}): ${TIPOS[s.tipo] || s.tipo}`
        : `Novo serviço: ${TIPOS[s.tipo] || s.tipo}`,
      body: detalhes(s) || "Abra o sistema para assumir.",
      tag: `saida-${s.id}`,
    });
  }

  if (!mensagens.length) return Response.json({ ok: true, enviadas: 0 });

  // Envia para todos os celulares inscritos
  const { data: inscricoes } = await supabase.from("push_inscricoes").select("id, endpoint, p256dh, auth");
  let enviadas = 0;
  const mortas: string[] = [];

  for (const msg of mensagens) {
    for (const i of inscricoes || []) {
      try {
        await webpush.sendNotification(
          { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
          JSON.stringify({ ...msg, url: "/" }),
          { TTL: 60 * 60, urgency: "high" },
        );
        enviadas++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) mortas.push(i.id);
        else console.error("Erro ao enviar push:", status, (err as Error).message);
      }
    }
  }

  if (mortas.length) await supabase.from("push_inscricoes").delete().in("id", [...new Set(mortas)]);

  return Response.json({ ok: true, mensagens: mensagens.length, enviadas, removidas: mortas.length });
});
