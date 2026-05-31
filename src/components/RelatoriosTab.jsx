import React, { useMemo, useState } from "react";
import { styles } from "../styles/appStyles";
import { formatMoney } from "../utils/format";
import { SERVICE_TYPE_OPTIONS } from "../constants";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function temServico(services, nome) {
  return (services || []).some((s) => s.name === nome && s.checked);
}

function categorizarLocal(item) {
  const form = item.form || {};
  const s = item.services || [];

  if (
    temServico(s, "TRANSLADO AÉREO") ||
    temServico(s, "TRANSLADO TERRESTRE") ||
    temServico(s, "TRANSLADO FLUVIAL")
  ) return "Translado";
  if (temServico(s, "CREMAÇÃO")) return "Cremação";

  const tipo = form.velorioTipo;
  if (tipo === "residencia") return "Residência";
  if (tipo === "igreja") return "Igreja";
  if (tipo === "funeraria") {
    const u = form.velorioUnidade || "";
    if (u.includes("Cachoeirinha")) return "Unidade Cachoeirinha";
    if (u.includes("Santo Antônio")) return "Unidade Santo Antônio";
    if (u.includes("Cidade Nova"))   return "Unidade Cidade Nova";
    return "Funerária";
  }
  return "Não informado";
}

function agrupar(lista, keyFn) {
  const map = {};
  lista.forEach((item) => {
    const key = keyFn(item) || "—";
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ReportCard({ title, icon, children }) {
  return (
    <div style={{ ...styles.card, marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 18px 0", fontSize: 17, fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

function ProgressRow({ label, count, total, color = "var(--brand-accent)" }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5, gap: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-soft)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
          {count}{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: 8, background: "var(--border-soft)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: 8,
          width: `${pct}%`,
          background: color,
          borderRadius: 999,
          transition: "width 0.4s ease",
          minWidth: count > 0 ? 4 : 0,
        }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--card-bg-alt)",
      border: "1px solid var(--border-soft)",
      borderRadius: 16,
      padding: "16px 18px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-main)", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RelatoriosTab({ atendimentos }) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: "", fim: "" });

  function aplicarFiltro() {
    setFiltroAplicado({ inicio: dataInicio, fim: dataFim });
  }

  function limparFiltro() {
    setDataInicio("");
    setDataFim("");
    setFiltroAplicado({ inicio: "", fim: "" });
  }

  const lista = useMemo(() => {
    const { inicio, fim } = filtroAplicado;
    if (!inicio && !fim) return atendimentos || [];
    return (atendimentos || []).filter((item) => {
      const data = item.form?.dataAtendimento || item.dataAtendimento || "";
      if (inicio && data < inicio) return false;
      if (fim && data > fim) return false;
      return true;
    });
  }, [atendimentos, filtroAplicado]);

  const total = lista.length;

  // ── Relatório 1 — Por local ────────────────────────────────────────────────
  const porLocal = useMemo(
    () => agrupar(lista, categorizarLocal),
    [lista]
  );

  // ── Relatório 2 — Por tipo de serviço ────────────────────────────────────
  const labelTipo = (val) =>
    SERVICE_TYPE_OPTIONS.find((o) => o.value === val)?.label || (val || "Não informado").toUpperCase();

  const porTipo = useMemo(
    () => agrupar(lista, (item) => labelTipo(item.form?.tipoPlano || item.tipoPlano)),
    [lista]
  );

  // ── Relatório 3 — Financeiro ──────────────────────────────────────────────
  const financeiro = useMemo(() => {
    if (total === 0) return { totalGeral: 0, media: 0, maiorItem: null, top5: [] };

    const totalGeral = lista.reduce((acc, item) => acc + Number(item.totalValue || 0), 0);
    const media = totalGeral / total;

    const maiorItem = lista.reduce(
      (max, item) => Number(item.totalValue || 0) > Number(max.totalValue || 0) ? item : max,
      lista[0]
    );

    const servicosContagem = {};
    lista.forEach((item) => {
      (item.services || []).forEach((s) => {
        if (s.checked) {
          servicosContagem[s.name] = (servicosContagem[s.name] || 0) + 1;
        }
      });
    });
    const top5 = Object.entries(servicosContagem)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return { totalGeral, media, maiorItem, top5 };
  }, [lista, total]);

  // ── Relatório 4 — Por cemitério ───────────────────────────────────────────
  const porCemiterio = useMemo(
    () => agrupar(lista, (item) => item.form?.cemiterio || item.cemiterio || "Não informado"),
    [lista]
  );

  const periodoLabel = filtroAplicado.inicio || filtroAplicado.fim
    ? `${filtroAplicado.inicio || "início"} a ${filtroAplicado.fim || "hoje"}`
    : "todos os períodos";

  return (
    <section style={styles.moduleCard}>
      {/* Header */}
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>Relatórios</h2>
          <p style={styles.moduleSub}>Análise dos atendimentos — {periodoLabel}</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ ...styles.card, marginBottom: 20, background: "var(--card-bg-alt)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={styles.field}>
            <label style={styles.label}>Data início</label>
            <input
              type="date"
              style={styles.input}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Data fim</label>
            <input
              type="date"
              style={styles.input}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <button style={{ ...styles.primaryBtn, alignSelf: "flex-end", marginBottom: 14 }} onClick={aplicarFiltro}>
            Filtrar
          </button>
          <button style={{ ...styles.outlineDarkBtn, alignSelf: "flex-end", marginBottom: 14 }} onClick={limparFiltro}>
            Limpar
          </button>
        </div>

        <div style={styles.infoRow}>
          <div style={{ ...styles.infoPill, fontSize: 14, fontWeight: 800 }}>
            Total no período: {total} atendimento{total !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Nenhum atendimento no período</div>
          <div style={styles.modulePlaceholderText}>
            Ajuste o filtro de datas ou limpe o filtro para ver todos os registros.
          </div>
        </div>
      ) : (
        <>
          {/* Relatório 1 — Por Unidade/Local */}
          <ReportCard title="Por Unidade / Local de Velório" icon="🏛️">
            {porLocal.map(([label, count]) => (
              <ProgressRow key={label} label={label} count={count} total={total} />
            ))}
          </ReportCard>

          {/* Relatório 2 — Por Tipo de Serviço */}
          <ReportCard title="Por Tipo de Serviço" icon="📋">
            {porTipo.map(([label, count]) => (
              <ProgressRow key={label} label={label} count={count} total={total} color="#6366f1" />
            ))}
          </ReportCard>

          {/* Relatório 3 — Financeiro */}
          <ReportCard title="Resumo Financeiro" icon="💰">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              <StatBox
                label="Total arrecadado"
                value={`R$ ${formatMoney(financeiro.totalGeral)}`}
              />
              <StatBox
                label="Valor médio"
                value={`R$ ${formatMoney(financeiro.media)}`}
                sub={`por atendimento`}
              />
              <StatBox
                label="Maior atendimento"
                value={`R$ ${formatMoney(financeiro.maiorItem?.totalValue || 0)}`}
                sub={financeiro.maiorItem?.falecido || financeiro.maiorItem?.form?.falecido || "—"}
              />
            </div>

            {financeiro.top5.length > 0 && (
              <>
                <div style={{ ...styles.label, marginBottom: 12 }}>Top 5 serviços mais contratados</div>
                {financeiro.top5.map(([nome, count], idx) => {
                  const pctTop = financeiro.top5[0][1] > 0 ? Math.round((count / financeiro.top5[0][1]) * 100) : 0;
                  const medalColors = ["#f59e0b", "#94a3b8", "#b45309"];
                  const medalBg = medalColors[idx] || "var(--info-pill-bg)";
                  return (
                    <div key={nome} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 999,
                          background: medalBg,
                          color: idx < 3 ? "#fff" : "var(--info-pill-text)",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, flexShrink: 0,
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nome}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{count}×</span>
                      </div>
                      <div style={{ height: 6, background: "var(--border-soft)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: 6, width: `${pctTop}%`, background: "#f59e0b", borderRadius: 999, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </ReportCard>

          {/* Relatório 4 — Por Cemitério */}
          <ReportCard title="Por Cemitério" icon="⛪">
            {porCemiterio.map(([label, count]) => (
              <ProgressRow key={label} label={label} count={count} total={total} color="#22c55e" />
            ))}
          </ReportCard>
        </>
      )}
    </section>
  );
}
