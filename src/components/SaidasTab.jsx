import React, { useMemo, useState } from "react";
import { styles } from "../styles/appStyles";
import { useAgora } from "../hooks/useAgora";
import { SaidaCard } from "./SaidaCard";
import {
  SAIDA_TIPOS,
  SAIDA_TIPOS_ATENDENTE,
  SAIDA_LOCAL_TIPOS,
  getSaidaStatusVisivel,
  getSaidaTipoLabel,
} from "../constants/saidas";

const FORM_INICIAL = {
  tipo: "",
  falecido: "",
  local_tipo: "PORTO",
  local_ident: "",
  destino: "",
  descricao: "",
  quando: "agora",
  agendadoPara: "",
};

function pill(bg, color) {
  return { fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: bg, color };
}

// Aba do atendente: lança serviços avulsos para os motoristas e acompanha a frota
export function SaidasTab({ saidasApi }) {
  const { abertas, historico, destinos, criarSaida, cancelarSaida, loading } = saidasApi;
  const agora = useAgora();

  const [form, setForm] = useState(FORM_INICIAL);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [aba, setAba] = useState("abertos");
  const [busca, setBusca] = useState("");

  const cfg = SAIDA_TIPOS[form.tipo];

  function update(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErro("");
  }

  async function lancar(e) {
    e.preventDefault();
    if (!form.tipo) return setErro("Escolha o motivo da saída.");
    if (cfg.falecido && !form.falecido.trim()) return setErro("Informe o nome do falecido.");
    if (cfg.local && !form.local_ident.trim()) return setErro("Informe o barco, lancha ou voo.");
    if (cfg.destino && !form.destino.trim()) return setErro("Informe o destino.");

    let agendado_para = null;
    if (form.quando === "agendar") {
      if (!form.agendadoPara) return setErro("Informe a data e a hora do agendamento.");
      const d = new Date(form.agendadoPara);
      if (Number.isNaN(d.getTime())) return setErro("Data do agendamento inválida.");
      agendado_para = d.toISOString();
    }

    setSalvando(true);
    const res = await criarSaida({
      tipo: form.tipo,
      falecido: cfg.falecido ? form.falecido : "",
      local_tipo: cfg.local ? form.local_tipo : "",
      local_ident: cfg.local ? form.local_ident : "",
      destino: cfg.destino ? form.destino : "",
      descricao: form.descricao,
      agendado_para,
    });
    setSalvando(false);
    if (!res.ok) return setErro(`Não foi possível lançar: ${res.erro}`);
    setForm(FORM_INICIAL);
    setAviso("Serviço lançado para os motoristas.");
    setTimeout(() => setAviso(""), 4000);
  }

  async function cancelar(saida) {
    if (!window.confirm(`Cancelar ${getSaidaTipoLabel(saida.tipo)}${saida.falecido ? ` — ${saida.falecido}` : ""}?`)) return;
    const res = await cancelarSaida(saida.id);
    if (!res.ok) alert(`Não foi possível cancelar: ${res.erro}`);
  }

  const contagem = useMemo(() => {
    let aguardando = 0, andamento = 0, atrasadas = 0;
    abertas.forEach((s) => {
      const st = getSaidaStatusVisivel(s, agora);
      if (st === "em_andamento") andamento++;
      else if (st === "atrasada") atrasadas++;
      else aguardando++;
    });
    return { aguardando, andamento, atrasadas };
  }, [abertas, agora]);

  const historicoFiltrado = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return historico;
    return historico.filter((s) =>
      [getSaidaTipoLabel(s.tipo), s.falecido, s.motorista, s.carro, s.destino, s.local_ident, s.descricao, s.criado_por]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo))
    );
  }, [historico, busca]);

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setAba(key)}
      style={{
        background: "none", border: "none", padding: "10px 14px", fontSize: 13, cursor: "pointer",
        borderBottom: aba === key ? "2px solid var(--brand-accent)" : "2px solid transparent",
        fontWeight: aba === key ? 700 : 400,
        color: aba === key ? "var(--brand-accent)" : "var(--text-muted)",
      }}
    >
      {label}
    </button>
  );

  return (
    <section style={styles.moduleCard}>
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>Saídas da frota</h2>
          <p style={styles.moduleSub}>Serviços avulsos para os motoristas e controle de quem está com cada carro</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {contagem.atrasadas > 0 && <span style={pill("rgba(239,68,68,0.12)", "#b91c1c")}>{contagem.atrasadas} atrasada(s)</span>}
          <span style={pill("rgba(245,158,11,0.12)", "#b45309")}>{contagem.aguardando} aguardando</span>
          <span style={pill("rgba(59,130,246,0.12)", "#1d4ed8")}>{contagem.andamento} em andamento</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* ── Formulário ─────────────────────────────────────────────── */}
        <form onSubmit={lancar} style={{ ...styles.card, flex: "1 1 340px", maxWidth: 460, marginBottom: 0 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, color: "var(--text-main)" }}>Novo serviço</h3>

          <div style={styles.field}>
            <span style={styles.label}>Motivo</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {SAIDA_TIPOS_ATENDENTE.map((tipo) => {
                const ativo = form.tipo === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => update("tipo", tipo)}
                    style={{
                      minHeight: 44, borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: ativo ? 800 : 700,
                      border: ativo ? "2px solid var(--brand-accent)" : "1px solid var(--input-border)",
                      background: ativo ? "var(--info-pill-bg)" : "var(--input-bg)",
                      color: ativo ? "var(--brand-accent)" : "var(--text-main)",
                    }}
                  >
                    {SAIDA_TIPOS[tipo].label}
                  </button>
                );
              })}
            </div>
          </div>

          {cfg?.falecido && (
            <label style={styles.field}>
              <span style={styles.label}>Nome do falecido</span>
              <input style={styles.input} value={form.falecido} onChange={(e) => update("falecido", e.target.value)} />
            </label>
          )}

          {cfg?.local && (
            <div style={{ display: "grid", gridTemplateColumns: "130px minmax(0, 1fr)", gap: 10 }}>
              <label style={styles.field}>
                <span style={styles.label}>Local</span>
                <select style={styles.input} value={form.local_tipo} onChange={(e) => update("local_tipo", e.target.value)}>
                  {SAIDA_LOCAL_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Barco / lancha / voo</span>
                <input style={styles.input} value={form.local_ident} placeholder="Ex.: B/M Lady Amazonas" onChange={(e) => update("local_ident", e.target.value)} />
              </label>
            </div>
          )}

          {cfg?.destino && (
            <label style={styles.field}>
              <span style={styles.label}>Destino</span>
              <input style={styles.input} list="saidas-destinos" value={form.destino} onChange={(e) => update("destino", e.target.value)} />
              <datalist id="saidas-destinos">
                {destinos.map((d) => <option key={d} value={d} />)}
              </datalist>
            </label>
          )}

          {form.tipo && (
            <>
              <label style={styles.field}>
                <span style={styles.label}>Observação (opcional)</span>
                <input
                  style={styles.input}
                  value={form.descricao}
                  placeholder={form.tipo === "buscar_flores" ? "Ex.: Transportadora Rodoflor" : ""}
                  onChange={(e) => update("descricao", e.target.value)}
                />
              </label>

              <div style={styles.field}>
                <span style={styles.label}>Quando</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["agora", "Agora"], ["agendar", "Agendar"]].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => update("quando", v)}
                      style={{
                        flex: 1, minHeight: 44, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
                        border: form.quando === v ? "2px solid var(--brand-accent)" : "1px solid var(--input-border)",
                        background: form.quando === v ? "var(--info-pill-bg)" : "var(--input-bg)",
                        color: form.quando === v ? "var(--brand-accent)" : "var(--text-main)",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {form.quando === "agendar" && (
                  <input
                    type="datetime-local"
                    style={styles.input}
                    value={form.agendadoPara}
                    onChange={(e) => update("agendadoPara", e.target.value)}
                  />
                )}
              </div>

              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>
                O serviço fica em aberto: qualquer motorista pode assumir.
              </p>
            </>
          )}

          {erro && <div style={styles.errorBox}>{erro}</div>}
          {aviso && (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "rgba(34,197,94,0.12)", color: "#15803d", fontWeight: 600, fontSize: 13 }}>
              {aviso}
            </div>
          )}

          <button type="submit" disabled={salvando || !form.tipo} style={{ ...styles.primaryBtn, width: "100%", opacity: salvando || !form.tipo ? 0.6 : 1 }}>
            {salvando ? "Lançando..." : "Lançar para os motoristas"}
          </button>
        </form>

        {/* ── Listas ─────────────────────────────────────────────────── */}
        <div style={{ flex: "999 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-soft)" }}>
            {tabBtn("abertos", `Abertos (${abertas.length})`)}
            {tabBtn("historico", "Histórico")}
          </div>

          {loading && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</div>}

          {aba === "abertos" && !loading && (
            abertas.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, fontSize: 13, color: "var(--text-muted)" }}>
                Nenhuma saída em aberto.
              </div>
            ) : (
              abertas.map((s) => (
                <SaidaCard key={s.id} saida={s} agora={agora}>
                  {s.status === "aguardando" && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => cancelar(s)} style={{ ...styles.outlineDangerBtn, padding: "8px 12px", fontSize: 12 }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </SaidaCard>
              ))
            )
          )}

          {aba === "historico" && !loading && (
            <>
              <input
                style={styles.input}
                placeholder="Buscar por motorista, carro, falecido, destino..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {historicoFiltrado.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, fontSize: 13, color: "var(--text-muted)" }}>
                  Nenhuma saída no histórico.
                </div>
              ) : (
                historicoFiltrado.map((s) => <SaidaCard key={s.id} saida={s} agora={agora} />)
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
