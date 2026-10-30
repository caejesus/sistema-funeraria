import React, { useEffect, useMemo, useRef, useState } from "react";
import notificationSound from "../assets/notificacao.mp3";
import { SaidaCard } from "./SaidaCard";
import {
  SAIDA_AVISO_MINUTOS,
  getSaidaTipoLabel,
  getSaidaStatusVisivel,
  formatAgendamento,
  formatKm,
  parseKm,
} from "../constants/saidas";

// ─── Estilos ──────────────────────────────────────────────────────────────────

const btnPrimario = {
  width: "100%", minHeight: 48, background: "var(--brand-accent)", border: "none", borderRadius: 12,
  fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer",
};
const btnSecundario = {
  width: "100%", minHeight: 48, background: "none", border: "1px solid var(--border-soft)", borderRadius: 12,
  fontSize: 14, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer",
};
const inputStyle = {
  width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 12,
  padding: "12px 14px", fontSize: 16, color: "var(--input-text)", outline: "none", boxSizing: "border-box",
};
const rotulo = {
  display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase",
  letterSpacing: 0.6, marginBottom: 6,
};
const tituloSecao = {
  fontSize: 10, color: "var(--brand-accent)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 10,
};

function Modal({ titulo, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
      <div style={{ background: "var(--card-bg)", borderRadius: 18, padding: 20, width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main)" }}>{titulo}</div>
        {children}
      </div>
    </div>
  );
}

function EscolherCarro({ carros, valor, onChange, indisponiveis }) {
  if (!carros.length) {
    return <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhum carro cadastrado nas configurações.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {carros.map((carro) => {
        const bloqueado = !!indisponiveis[carro];
        const ativo = valor === carro;
        return (
          <button
            key={carro}
            type="button"
            disabled={bloqueado}
            onClick={() => onChange(carro)}
            style={{
              minHeight: 50, borderRadius: 12, padding: "0 14px", fontSize: 15, textAlign: "left",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              cursor: bloqueado ? "not-allowed" : "pointer",
              border: ativo ? "2px solid var(--brand-accent)" : "1px solid var(--border-soft)",
              background: bloqueado ? "var(--card-bg-alt)" : ativo ? "var(--info-pill-bg)" : "var(--card-bg)",
              color: bloqueado ? "var(--text-muted)" : ativo ? "var(--brand-accent)" : "var(--text-main)",
              fontWeight: ativo ? 800 : 600,
            }}
          >
            <span>{carro}</span>
            {bloqueado && <span style={{ fontSize: 12, fontWeight: 600 }}>{indisponiveis[carro] === "em_servico" ? "Em serviço" : "Indisponível"}</span>}
            {ativo && <span style={{ fontSize: 12 }}>Selecionado</span>}
          </button>
        );
      })}
    </div>
  );
}

function CampoKm({ label, valor, onChange, dica }) {
  return (
    <label style={{ display: "block" }}>
      <span style={rotulo}>{label}</span>
      <input
        inputMode="numeric"
        style={{ ...inputStyle, fontSize: 20, fontWeight: 700 }}
        value={valor}
        onChange={(e) => {
          const n = parseKm(e.target.value);
          onChange(n == null ? "" : formatKm(n));
        }}
      />
      {dica && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{dica}</span>}
    </label>
  );
}

// ─── Aviso de saídas próximas (fica no topo da tela da equipe) ────────────────

export function SaidasAviso({ abertas, agora, audioLiberado, onVer }) {
  const avisadas = useRef(new Set());

  const proximas = useMemo(() => {
    const limite = agora + SAIDA_AVISO_MINUTOS * 60 * 1000;
    return abertas.filter(
      (s) => s.status === "aguardando" && s.agendado_para && new Date(s.agendado_para).getTime() <= limite
    );
  }, [abertas, agora]);

  useEffect(() => {
    const novas = proximas.filter((s) => !avisadas.current.has(s.id));
    if (!novas.length) return;
    novas.forEach((s) => avisadas.current.add(s.id));
    if (audioLiberado) {
      try { new Audio(notificationSound).play().catch(() => {}); } catch { /* sem som */ }
    }
  }, [proximas, audioLiberado]);

  if (!proximas.length) return null;

  return (
    <button
      type="button"
      onClick={onVer}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
        background: "rgba(239,68,68,0.1)", border: "2px solid #ef4444", borderRadius: 14, padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 4,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c", letterSpacing: 0.5 }}>
        <i className="fa-solid fa-bell" style={{ marginRight: 6 }} />
        SAÍDA AGENDADA {proximas.length > 1 ? `(${proximas.length})` : ""}
      </span>
      {proximas.slice(0, 3).map((s) => {
        const atrasada = getSaidaStatusVisivel(s, agora) === "atrasada";
        return (
          <span key={s.id} style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
            {getSaidaTipoLabel(s.tipo)}{s.falecido ? ` · ${s.falecido}` : ""} — {atrasada ? "ATRASADA, era " : ""}{formatAgendamento(s.agendado_para)}
          </span>
        );
      })}
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Toque para ver</span>
    </button>
  );
}

// ─── Aba "Saídas" da tela da equipe ───────────────────────────────────────────

export function SaidasMotorista({ saidasApi, session, settings, agora }) {
  const { abertas, carrosIndisponiveis, ultimoKmPorCarro, iniciarSaida, criarSaidaAvulsa, concluirSaida } = saidasApi;
  const carros = settings?.cars || [];
  const nome = session?.name || "";

  const [modal, setModal] = useState(null); // { tipo: "iniciar" | "concluir" | "avulsa", saida? }
  const [carro, setCarro] = useState("");
  const [km, setKm] = useState("");
  const [descricao, setDescricao] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const minhas = abertas.filter((s) => s.status === "em_andamento" && s.motorista === nome);
  const aguardando = abertas.filter((s) => s.status === "aguardando");
  const comOutros = abertas.filter((s) => s.status === "em_andamento" && s.motorista !== nome);

  function abrir(tipo, saida = null) {
    setModal({ tipo, saida });
    setCarro("");
    setKm("");
    setDescricao("");
    setObs("");
    setErro("");
  }
  function fechar() {
    if (!salvando) setModal(null);
  }

  const ultimoKm = carro ? ultimoKmPorCarro[carro] : null;
  const kmNum = parseKm(km);

  async function confirmarSaida() {
    if (modal.tipo === "avulsa" && !descricao.trim()) return setErro("Descreva o motivo da saída.");
    if (!carro) return setErro("Escolha o carro.");
    if (kmNum == null) return setErro("Informe o KM de saída.");
    if (ultimoKm && kmNum < ultimoKm &&
      !window.confirm(`O KM informado (${formatKm(kmNum)}) é menor que o último registrado para este carro (${formatKm(ultimoKm)}). Confirmar mesmo assim?`)) {
      return;
    }
    setSalvando(true);
    const res = modal.tipo === "avulsa"
      ? await criarSaidaAvulsa({ descricao, carro, kmSaida: kmNum })
      : await iniciarSaida(modal.saida.id, { carro, kmSaida: kmNum });
    setSalvando(false);
    if (!res.ok) return setErro(res.erro);
    setModal(null);
  }

  async function confirmarRetorno() {
    if (kmNum == null) return setErro("Informe o KM de retorno.");
    const saida = modal.saida;
    if (saida.km_saida != null && kmNum < saida.km_saida) {
      return setErro(`O KM de retorno não pode ser menor que o de saída (${formatKm(saida.km_saida)}).`);
    }
    setSalvando(true);
    const res = await concluirSaida(saida.id, { kmRetorno: kmNum, obs });
    setSalvando(false);
    if (!res.ok) return setErro(res.erro);
    setModal(null);
  }

  const percorrido =
    modal?.tipo === "concluir" && kmNum != null && modal.saida.km_saida != null && kmNum >= modal.saida.km_saida
      ? kmNum - modal.saida.km_saida
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {minhas.length > 0 && (
        <div>
          <div style={tituloSecao}>Com você agora · {minhas.length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {minhas.map((s) => (
              <SaidaCard key={s.id} saida={s} agora={agora} destaque>
                <button type="button" style={{ ...btnPrimario, marginTop: 6 }} onClick={() => abrir("concluir", s)}>
                  Retornei — concluir
                </button>
              </SaidaCard>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={tituloSecao}>Saídas em aberto · {aguardando.length}</div>
        {aguardando.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>Nenhum serviço aguardando motorista.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aguardando.map((s) => (
              <SaidaCard key={s.id} saida={s} agora={agora}>
                <button type="button" style={{ ...btnPrimario, marginTop: 6 }} onClick={() => abrir("iniciar", s)}>
                  Assumir e iniciar
                </button>
              </SaidaCard>
            ))}
          </div>
        )}
      </div>

      {comOutros.length > 0 && (
        <div>
          <div style={tituloSecao}>Com outros motoristas · {comOutros.length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comOutros.map((s) => <SaidaCard key={s.id} saida={s} agora={agora} />)}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => abrir("avulsa")}
        style={{
          minHeight: 52, borderRadius: 12, border: "2px dashed var(--brand-accent)", background: "none",
          color: "var(--brand-accent)", fontSize: 15, fontWeight: 800, cursor: "pointer",
        }}
      >
        <i className="fa-solid fa-plus" style={{ marginRight: 8 }} />Saída avulsa
      </button>

      {/* ── Modais ───────────────────────────────────────────────────── */}
      {modal && (modal.tipo === "iniciar" || modal.tipo === "avulsa") && (
        <Modal titulo={modal.tipo === "avulsa" ? "Saída avulsa" : `Iniciar — ${getSaidaTipoLabel(modal.saida.tipo)}`}>
          {modal.tipo === "avulsa" ? (
            <label style={{ display: "block" }}>
              <span style={rotulo}>Motivo</span>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: "none" }}
                value={descricao}
                placeholder="Ex.: comprar fita adesiva"
                onChange={(e) => { setDescricao(e.target.value); setErro(""); }}
              />
            </label>
          ) : (
            modal.saida.falecido && (
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>{modal.saida.falecido}</div>
            )
          )}

          <div>
            <span style={rotulo}>Escolha o carro</span>
            <EscolherCarro carros={carros} valor={carro} onChange={(c) => { setCarro(c); setErro(""); }} indisponiveis={carrosIndisponiveis} />
          </div>

          <CampoKm
            label="KM de saída"
            valor={km}
            onChange={(v) => { setKm(v); setErro(""); }}
            dica={ultimoKm ? `Último KM registrado deste carro: ${formatKm(ultimoKm)}` : ""}
          />

          {erro && <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{erro}</div>}

          <button type="button" style={{ ...btnPrimario, opacity: salvando ? 0.6 : 1 }} disabled={salvando} onClick={confirmarSaida}>
            {salvando ? "Salvando..." : modal.tipo === "avulsa" ? "Iniciar saída avulsa" : "Iniciar saída"}
          </button>
          <button type="button" style={btnSecundario} onClick={fechar}>Cancelar</button>
        </Modal>
      )}

      {modal && modal.tipo === "concluir" && (
        <Modal titulo="Retorno">
          <div style={{ fontSize: 14, color: "var(--text-main)" }}>
            <strong>{getSaidaTipoLabel(modal.saida.tipo)}</strong>
            {modal.saida.falecido ? ` · ${modal.saida.falecido}` : ""}
            {modal.saida.tipo === "avulsa" && modal.saida.descricao ? ` · ${modal.saida.descricao}` : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {modal.saida.carro} · KM saída {formatKm(modal.saida.km_saida)}
          </div>

          <CampoKm label="KM de retorno" valor={km} onChange={(v) => { setKm(v); setErro(""); }} />
          {percorrido != null && (
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--brand-accent)" }}>Percorrido: {formatKm(percorrido)} km</div>
          )}

          <label style={{ display: "block" }}>
            <span style={rotulo}>Observação (opcional)</span>
            <input style={inputStyle} value={obs} placeholder="Ex.: voo atrasou 1h" onChange={(e) => setObs(e.target.value)} />
          </label>

          {erro && <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{erro}</div>}

          <button type="button" style={{ ...btnPrimario, opacity: salvando ? 0.6 : 1 }} disabled={salvando} onClick={confirmarRetorno}>
            {salvando ? "Salvando..." : "Concluir"}
          </button>
          <button type="button" style={btnSecundario} onClick={fechar}>Cancelar</button>
        </Modal>
      )}
    </div>
  );
}
