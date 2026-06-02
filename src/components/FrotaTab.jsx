import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { styles } from "../styles/appStyles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  disponivel:      { label: "Disponível",      color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  em_servico:      { label: "Em serviço",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  manutencao:      { label: "Manutenção",      color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  sem_combustivel: { label: "Sem combustível", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  reservado:       { label: "Reservado",       color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const OPCOES_INDISPONIVEL = [
  { value: "manutencao",      label: "Manutenção"      },
  { value: "sem_combustivel", label: "Sem combustível" },
  { value: "reservado",       label: "Reservado"       },
];

function getNome(car) {
  const i = car.indexOf(" - ");
  return i >= 0 ? car.slice(0, i) : car;
}
function getPlaca(car) {
  const i = car.indexOf(" - ");
  return i >= 0 ? car.slice(i + 3) : "";
}
function formatTS(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FrotaTab({ settings, session }) {
  const [frota,    setFrota]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modal,    setModal]    = useState({ open: false, carro: "" });
  const [modalStatus, setModalStatus] = useState("");
  const [modalObs,    setModalObs]    = useState("");

  const carros = useMemo(() => settings?.cars || [], [settings?.cars]);

  // ── Load ───────────────────────────────────────────────────────────────────

  async function carregarFrota() {
    const { data } = await supabase.from("frota").select("*");
    setFrota(data || []);
    setLoading(false);
  }

  useEffect(() => { carregarFrota(); }, []);

  // Auto-create records for cars not yet in DB
  useEffect(() => {
    if (loading || !carros.length) return;
    (async () => {
      const { data: existentes } = await supabase.from("frota").select("carro");
      const jaNoBD = new Set((existentes || []).map(r => r.carro));
      const novos = carros.filter(c => !jaNoBD.has(c));
      if (!novos.length) return;
      await supabase.from("frota").upsert(
        novos.map(c => ({
          carro: c, status: "disponivel", motivo: "",
          updated_by: "", updated_at: new Date().toISOString(),
        })),
        { onConflict: "carro" }
      );
      carregarFrota();
    })();
  }, [loading, carros]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("frota-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "frota" }, carregarFrota)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const veiculos = useMemo(() => {
    return carros.map(carro => {
      const reg = frota.find(r => r.carro === carro) || { carro, status: "disponivel" };
      return { ...reg, carro };
    });
  }, [carros, frota]);

  const emServico   = veiculos.filter(v => v.status === "em_servico").length;
  const disponiveis = veiculos.filter(v => v.status === "disponivel").length;

  // ── Actions ────────────────────────────────────────────────────────────────

  async function marcarDisponivel(carro) {
    await supabase.from("frota").upsert({
      carro,
      status: "disponivel",
      motivo: "",
      atendimento_id: null,
      updated_by: session?.name || "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "carro" });
  }

  async function confirmarIndisponivel() {
    if (!modalStatus) return;
    setSalvando(true);
    await supabase.from("frota").upsert({
      carro: modal.carro,
      status: modalStatus,
      motivo: modalObs,
      atendimento_id: null,
      updated_by: session?.name || "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "carro" });
    setSalvando(false);
    fecharModal();
  }

  function abrirModal(carro, statusAtual = "", obsAtual = "") {
    setModal({ open: true, carro });
    setModalStatus(statusAtual);
    setModalObs(obsAtual);
  }

  function fecharModal() {
    setModal({ open: false, carro: "" });
    setModalStatus("");
    setModalObs("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section style={styles.moduleCard}>
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Carregando frota...</div>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.moduleCard}>

      {/* ── Modal de indisponibilidade ───────────────────────────────────── */}
      {modal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card-bg-soft)", borderRadius: 18, padding: 24, width: "100%", maxWidth: 360, border: "1px solid var(--border-soft)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", marginBottom: 18 }}>
              Motivo da indisponibilidade
            </div>

            {OPCOES_INDISPONIVEL.map(({ value, label }) => {
              const sel = modalStatus === value;
              return (
                <button key={value} type="button"
                  style={{ width: "100%", display: "block", textAlign: "left", marginBottom: 8, padding: "10px 14px", borderRadius: 10, fontSize: 14, cursor: "pointer", background: sel ? "rgba(38,177,196,0.12)" : "var(--card-bg-alt)", border: `1px solid ${sel ? "rgba(38,177,196,0.3)" : "var(--border-soft)"}`, color: sel ? "var(--brand-accent)" : "var(--text-main)", fontWeight: sel ? 600 : 400 }}
                  onClick={() => setModalStatus(value)}>
                  {sel && <i className="fa-solid fa-check" style={{ marginRight: 8, fontSize: 11 }} />}
                  {label}
                </button>
              );
            })}

            <textarea
              style={{ width: "100%", marginTop: 8, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "var(--input-text)", resize: "none", height: 60, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              placeholder="Observação (opcional)..."
              value={modalObs}
              onChange={e => setModalObs(e.target.value)}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="button"
                style={{ flex: 1, background: modalStatus ? "var(--brand-accent)" : "rgba(38,177,196,0.3)", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, color: "#fff", cursor: modalStatus ? "pointer" : "not-allowed", opacity: salvando ? 0.7 : 1 }}
                onClick={confirmarIndisponivel} disabled={!modalStatus || salvando}>
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
              <button type="button"
                style={{ flex: 1, background: "none", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "11px 0", fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}
                onClick={fecharModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>Controle de Frota</h2>
          <p style={styles.moduleSub}>Acompanhe a disponibilidade dos veículos em tempo real</p>
        </div>
      </div>

      {/* ── Resumo ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total de veículos", value: veiculos.length, color: "var(--text-main)" },
          { label: "Em serviço",        value: emServico,       color: "#3b82f6" },
          { label: "Disponíveis",       value: disponiveis,     color: "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--card-bg-alt)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Lista de veículos ────────────────────────────────────────────────── */}
      {veiculos.length === 0 ? (
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Nenhum veículo cadastrado</div>
          <div style={styles.modulePlaceholderText}>Cadastre veículos em Configurações → Carros.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {veiculos.map((v) => {
            const cfg   = STATUS_CFG[v.status] || STATUS_CFG.disponivel;
            const nome  = getNome(v.carro);
            const placa = getPlaca(v.carro);
            const podeMarcarIndisponivel  = v.status === "disponivel";
            const podeMarcarDisponivel    = v.status !== "disponivel" && v.status !== "em_servico";
            const podeAlterar             = podeMarcarDisponivel;

            return (
              <div key={v.carro} style={{ background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>

                {/* Indicador de status */}
                <div style={{ paddingTop: 4, flexShrink: 0 }}>
                  <i className="fa-solid fa-circle" style={{ fontSize: 12, color: cfg.color }} />
                </div>

                {/* Informações */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
                      <i className="fa-solid fa-truck" style={{ fontSize: 13, color: "var(--text-muted)" }} />
                      {nome}
                      {placa && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>{placa}</span>}
                    </div>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {cfg.label}
                    </span>
                  </div>

                  {v.motivo && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{v.motivo}</div>
                  )}
                  {v.atendimento_id && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                      Em serviço em: <strong>{v.atendimento_id}</strong>
                    </div>
                  )}
                  {v.updated_at && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: podeMarcarIndisponivel || podeMarcarDisponivel ? 10 : 0 }}>
                      Atualizado {formatTS(v.updated_at)}{v.updated_by ? ` por ${v.updated_by}` : ""}
                    </div>
                  )}

                  {/* Botões */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {podeMarcarIndisponivel && (
                      <button type="button"
                        style={{ background: "none", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--text-main)", cursor: "pointer" }}
                        onClick={() => abrirModal(v.carro)}>
                        Marcar indisponível
                      </button>
                    )}
                    {podeMarcarDisponivel && (
                      <button type="button"
                        style={{ background: "var(--brand-accent)", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#fff", cursor: "pointer" }}
                        onClick={() => marcarDisponivel(v.carro)}>
                        <i className="fa-solid fa-check" style={{ marginRight: 5 }} />Marcar disponível
                      </button>
                    )}
                    {podeAlterar && (
                      <button type="button"
                        style={{ background: "none", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--text-main)", cursor: "pointer" }}
                        onClick={() => abrirModal(v.carro, v.status, v.motivo || "")}>
                        Alterar motivo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
