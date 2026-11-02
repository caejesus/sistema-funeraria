import React, { useMemo } from "react";
import { OPERATION_STAGES } from "../constants";
import { getSaidaTipoLabel } from "../constants/saidas";
import { getCemiterioNome } from "../utils/format";
import { useAgora } from "../hooks/useAgora";
import { PlantaoBloco } from "./PlantaoBloco";

// Início = painel do dia: plantão, velórios em andamento, serviços em procedimento e saídas agendadas

const FUSO = "America/Manaus";
const DIA_MS = 24 * 60 * 60 * 1000;

function isoManaus(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

// "YYYY-MM-DD" + "HH:MM" (horário de Manaus) → milissegundos
function momento(data, hora) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ""))) return null;
  const h = /^\d{2}:\d{2}/.test(String(hora || "")) ? String(hora).slice(0, 5) : "23:59";
  return new Date(`${data}T${h}:00-04:00`).getTime();
}

function nomeBonito(nome) {
  return String(nome || "")
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (m, e, l) => e + l.toUpperCase())
    .replace(/\s(De|Da|Do|Dos|Das|E)(?=\s)/g, (m) => m.toLowerCase());
}

function horaCurta(ms) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
}

function rotuloDia(ms, agora) {
  const d = isoManaus(ms);
  if (d === isoManaus(agora)) return "";
  if (d === isoManaus(agora + DIA_MS)) return "amanhã ";
  if (d === isoManaus(agora - DIA_MS)) return "ontem ";
  return `${new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO })} `;
}

function ativo(item) {
  return item && item.status !== "Concluído";
}

function local(f) {
  if (!f.velorioTipo || f.velorioTipo === "funeraria") {
    return [f.velorioSala, String(f.velorioUnidade || "").replace(/^Unidade\s+/i, "")].filter(Boolean).join(" · ");
  }
  if (f.velorioTipo === "igreja") return f.velorioNomeLocal || "Igreja";
  if (f.velorioTipo === "residencia") return "Residência da família";
  if (f.velorioTipo === "viagem") return f.cidadeDestino ? `Translado · ${f.cidadeDestino}` : "Translado";
  return "";
}

function pessoaDaEtapa(etapa = {}) {
  return etapa.driver || etapa.technician || etapa.support || etapa.attendant || "";
}

const ROTULO_PESSOA = { remocao: "motorista", entrega: "motorista", sepultamento: "motorista", procedimentoClinico: "técnico", ornamentacao: "apoio", atendimento: "atendente" };

function Bloco({ icone, titulo, contador, children }) {
  return (
    <section style={{ background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 16, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <i className={icone} style={{ color: "var(--brand-accent)", fontSize: 16 }} aria-hidden="true" />
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>{titulo}</span>
        {contador != null && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{contador}</span>}
      </div>
      {children}
    </section>
  );
}

function Linha({ onClick, esquerda, direita, cor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start",
        padding: "10px 0", border: "none", borderTop: "1px solid var(--border-soft)", background: "none",
        cursor: onClick ? "pointer" : "default", textAlign: "left", fontFamily: "inherit", color: cor || "var(--text-main)",
      }}
    >
      <span style={{ minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>{esquerda}</span>
      <span style={{ flexShrink: 0, fontSize: 12, lineHeight: 1.45, textAlign: "right", color: cor || "var(--text-muted)" }}>{direita}</span>
    </button>
  );
}

function Vazio({ children }) {
  return <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "10px 0", borderTop: "1px solid var(--border-soft)" }}>{children}</div>;
}

export function InicioPainel({ session, atendimentos = [], saidasApi, onAbrirAtendimento, onIrPara }) {
  const agora = useAgora(30000);

  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }).format(new Date(agora)));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataLonga = new Date(agora).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: FUSO });
  const primeiroNome = String(session?.name || "").trim().split(/\s+/)[0] || "";

  const { velorios, procedimentos } = useMemo(() => {
    const limiteCriado = agora - 10 * DIA_MS;
    const recentes = atendimentos.filter((a) => ativo(a) && (!a.createdAt || new Date(a.createdAt).getTime() > limiteCriado));
    const listaVelorios = [];
    const listaProcedimentos = [];

    recentes.forEach((a) => {
      const f = a.form || {};
      const etapas = a.operationalStages || {};
      const saida = momento(f.dataSaida, f.horaSaida);
      const saidaPassou = saida != null && saida + 15 * 60 * 1000 < agora;
      const inicioVelorio = momento(f.dataInicioVelorio || f.dataAtendimento, f.horarioVelorio || f.inicioAs || "");
      const temLocal = !!local(f);
      const velorioAndando = etapas.velorio?.status === "em_andamento";
      const velorioComecou = temLocal && !saidaPassou && etapas.velorio?.status !== "finalizado"
        && ((inicioVelorio != null && inicioVelorio <= agora && (f.horarioVelorio || f.inicioAs)) || etapas.entrega?.status === "finalizado");

      if (velorioAndando || velorioComecou) {
        listaVelorios.push({ a, f, saida, inicioVelorio });
        return;
      }
      if (saidaPassou && etapas.sepultamento?.status !== "em_andamento") return;
      const finalizadas = OPERATION_STAGES.filter((s) => etapas[s.key]?.status === "finalizado").length;
      if (finalizadas === OPERATION_STAGES.length) return;
      const atual = OPERATION_STAGES.find((s) => etapas[s.key]?.status === "em_andamento")
        || OPERATION_STAGES.find((s) => etapas[s.key]?.status !== "finalizado");
      listaProcedimentos.push({ a, f, atual, finalizadas, pessoa: atual ? pessoaDaEtapa(etapas[atual.key]) : "" });
    });

    listaVelorios.sort((x, y) => (x.saida ?? Infinity) - (y.saida ?? Infinity));
    listaProcedimentos.sort((x, y) => new Date(y.a.createdAt || 0) - new Date(x.a.createdAt || 0));
    return {
      velorios: listaVelorios,
      procedimentos: listaProcedimentos,
    };
  }, [atendimentos, agora]);

  const saidas = useMemo(() => {
    const fimAmanha = momento(isoManaus(agora + DIA_MS), "23:59");
    const inicioHoje = momento(isoManaus(agora), "00:00");
    const lista = [];

    atendimentos.filter(ativo).forEach((a) => {
      const f = a.form || {};
      const t = momento(f.dataSaida, f.horaSaida);
      if (t == null || t < inicioHoje || t > fimAmanha) return;
      const saiu = ["em_andamento", "finalizado"].includes(a.operationalStages?.sepultamento?.status);
      if (saiu && t < agora) return;
      lista.push({
        id: `a-${a.id}`,
        t,
        atrasada: !saiu && t < agora,
        titulo: `${nomeBonito(a.falecido || f.falecido)} → ${getCemiterioNome(f.cemiterio) || f.cidadeDestino || "destino"}`,
        detalhe: local(f),
        abrir: () => onAbrirAtendimento?.(a.id),
      });
    });

    (saidasApi?.abertas || []).forEach((s) => {
      const t = new Date(s.agendado_para || s.created_at).getTime();
      if (t > fimAmanha) return;
      lista.push({
        id: `s-${s.id}`,
        t,
        atrasada: s.status === "aguardando" && t < agora,
        emAndamento: s.status === "em_andamento",
        titulo: `${getSaidaTipoLabel(s.tipo)}${s.falecido ? ` · ${nomeBonito(s.falecido)}` : ""}`,
        detalhe: s.status === "em_andamento" ? `em andamento${s.motorista ? ` · ${s.motorista}` : ""}` : (s.destino || s.local_ident || ""),
        abrir: () => onIrPara?.("saidas"),
      });
    });

    return lista.sort((x, y) => x.t - y.t);
  }, [atendimentos, saidasApi?.abertas, agora, onAbrirAtendimento, onIrPara]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1200 }}>
      <header>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-main)" }}>
          {saudacao}{primeiroNome ? `, ${nomeBonito(primeiroNome)}` : ""}
        </div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
          {dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)} · {horaCurta(agora)}
        </div>
      </header>

      <PlantaoBloco session={session} onAbrirAtendimento={onAbrirAtendimento} onNovoAviso />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 16 }}>
        <Bloco icone="fa-solid fa-church" titulo="Velórios em andamento" contador={velorios.length}>
          {velorios.length === 0 && <Vazio>Nenhum velório acontecendo agora.</Vazio>}
          {velorios.map(({ a, f, saida, inicioVelorio }) => (
            <Linha
              key={a.id}
              onClick={() => onAbrirAtendimento?.(a.id)}
              esquerda={<><b style={{ fontWeight: 700 }}>{nomeBonito(a.falecido || f.falecido)}</b><br /><span style={{ color: "var(--text-muted)" }}>{local(f) || "Local não informado"}</span></>}
              direita={<>
                {inicioVelorio != null && (f.horarioVelorio || f.inicioAs) ? `desde ${rotuloDia(inicioVelorio, agora)}${horaCurta(inicioVelorio)}` : "velório"}
                <br />
                {saida != null ? `saída ${rotuloDia(saida, agora)}${horaCurta(saida)}` : "sem horário de saída"}
              </>}
            />
          ))}
        </Bloco>

        <Bloco icone="fa-solid fa-diagram-project" titulo="Serviços em procedimento" contador={procedimentos.length}>
          {procedimentos.length === 0 && <Vazio>Nenhum serviço em procedimento.</Vazio>}
          {procedimentos.map(({ a, f, atual, finalizadas, pessoa }) => (
            <Linha
              key={a.id}
              onClick={() => onAbrirAtendimento?.(a.id)}
              esquerda={<><b style={{ fontWeight: 700 }}>{nomeBonito(a.falecido || f.falecido)}</b><br /><span style={{ color: "var(--text-muted)" }}>{atual?.label || "—"}</span></>}
              direita={<>
                {finalizadas} de {OPERATION_STAGES.length} etapas
                {pessoa && <><br />{ROTULO_PESSOA[atual?.key] || "responsável"}: {pessoa}</>}
              </>}
            />
          ))}
        </Bloco>

        <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
          <Bloco icone="fa-solid fa-car-side" titulo="Saídas agendadas" contador="hoje e amanhã">
            {saidas.length === 0 && <Vazio>Nenhuma saída agendada para hoje e amanhã.</Vazio>}
            {saidas.map((s) => (
              <Linha
                key={s.id}
                onClick={s.abrir}
                cor={s.atrasada ? "#dc2626" : undefined}
                esquerda={<><b style={{ fontWeight: 700 }}>{rotuloDia(s.t, agora)}{horaCurta(s.t)}</b> · {s.titulo}</>}
                direita={s.atrasada ? "atrasada" : s.detalhe}
              />
            ))}
          </Bloco>
        </div>
      </div>
    </div>
  );
}
