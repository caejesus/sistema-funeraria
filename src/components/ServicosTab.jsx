import React, { useState, useMemo } from "react";
import { formatDateBR, formatMoney, getCemiterioNome } from "../utils/format";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  "Concluído":         { bg: "rgba(34,197,94,0.12)",   color: "#15803d", border: "rgba(34,197,94,0.25)" },
  "Em andamento":      { bg: "rgba(249,115,22,0.12)",  color: "#c2410c", border: "rgba(249,115,22,0.25)" },
  "Em progresso":      { bg: "rgba(59,130,246,0.12)",  color: "#1d4ed8", border: "rgba(59,130,246,0.25)" },
  "Aguardando início": { bg: "rgba(245,158,11,0.12)",  color: "#b45309", border: "rgba(245,158,11,0.28)" },
};
const STATUS_DEFAULT = { bg: "rgba(148,163,184,0.12)", color: "#64748b", border: "rgba(148,163,184,0.25)" };

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_DEFAULT;
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 999,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      {status || "—"}
    </span>
  );
}

// ─── Info cell ────────────────────────────────────────────────────────────────

function InfoCell({ label, value, valueStyle }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-main)", ...valueStyle }}>
        {value}
      </div>
    </div>
  );
}

// ─── Tab list ─────────────────────────────────────────────────────────────────

const TAB_LIST = [
  { key: "todos",             label: "Todos" },
  { key: "Aguardando início", label: "Aguardando" },
  { key: "Em andamento",      label: "Em andamento" },
  { key: "Em progresso",      label: "Em progresso" },
  { key: "Concluído",         label: "Concluído" },
];

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ children }) {
  return (
    <span style={{
      background: "var(--info-pill-bg)",
      color: "var(--info-pill-text)",
      border: "1px solid var(--border-soft)",
      borderRadius: 999,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

// ─── Button helpers ───────────────────────────────────────────────────────────

const outlineBtn = {
  background: "none",
  border: "1px solid var(--border-soft)",
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 13,
  color: "var(--text-main)",
  cursor: "pointer",
};

const primaryBtn = {
  background: "var(--brand-accent)",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 13,
  color: "#fff",
  cursor: "pointer",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ServicosTab({ atendimentos, openAttendance, onDelete, toggleEquipeAcionada }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("todos");

  const filtered = useMemo(() => {
    let list = activeTab === "todos"
      ? atendimentos
      : atendimentos.filter((i) => i.status === activeTab);
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((item) =>
      [item.numero, item.falecido, item.responsavelNome, item.cemiterio, item.motorista, item.atendente, item.unidade]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [search, atendimentos, activeTab]);

  return (
    <section style={{ paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: "var(--text-main)" }}>
          Serviços
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Consulte, edite e reabra registros de atendimento
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-soft)",
        borderRadius: "14px 14px 0 0",
        display: "flex",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {TAB_LIST.map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid var(--brand-accent)" : "2px solid transparent",
                padding: "14px 18px",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--brand-accent)" : "var(--text-muted)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Search + pills */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-soft)",
        borderTop: "none",
        borderRadius: "0 0 14px 14px",
        padding: "16px 20px",
        marginBottom: 20,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--card-bg-alt)",
          border: "1px solid var(--border-soft)",
          borderRadius: 14,
          padding: "12px 16px",
        }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--text-main)",
            }}
            placeholder="Buscar por número, falecido, responsável, cemitério..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Pill>Total salvos: {atendimentos.length}</Pill>
          <Pill>Exibindo: {filtered.length}</Pill>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "48px 24px",
          background: "var(--card-bg)",
          border: "1px solid var(--border-soft)",
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: "var(--text-main)" }}>
            Nenhum serviço encontrado
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {atendimentos.length === 0
              ? "Finalize um atendimento para ele aparecer aqui."
              : "Tente ajustar o filtro ou a busca."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((item) => {
            const equipeAcionada = !!item.equipeAcionada;
            const metaParts = [
              formatDateBR(item.dataAtendimento || ""),
              item.horaAtendimento || "",
              item.unidade || "",
              item.sala || "",
            ].filter(Boolean);

            return (
              <div
                key={item.id}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 16,
                  padding: "20px 22px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--brand-accent)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, marginBottom: 4 }}>
                      {item.numero || "—"}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text-main)", marginBottom: 4 }}>
                      {item.falecido || "Sem nome informado"}
                    </div>
                    {metaParts.length > 0 && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {metaParts.join(" • ")}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                {/* Info grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px 16px",
                  background: "var(--card-bg-alt)",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                }}>
                  <InfoCell label="Responsável" value={item.responsavelNome} />
                  <InfoCell label="Cemitério"   value={getCemiterioNome(item.cemiterio)} />
                  <InfoCell label="Atendente"   value={item.atendente} />
                  <InfoCell label="Local do óbito" value={item.localObito} />
                  <InfoCell
                    label="Total"
                    value={item.totalValue != null ? `R$ ${formatMoney(item.totalValue)}` : null}
                    valueStyle={{ color: "var(--brand-accent)" }}
                  />
                  <InfoCell
                    label="Equipe"
                    value={equipeAcionada ? "Acionada" : "Não acionada"}
                    valueStyle={{ color: equipeAcionada ? "#15803d" : "var(--text-muted)" }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={outlineBtn} onClick={() => openAttendance(item, "preview")}>
                      <i className="fa-solid fa-file-invoice" style={{ marginRight: 6 }} />Ver / PDF
                    </button>
                    <button
                      style={outlineBtn}
                      onClick={() => {
                        const link = `${window.location.origin}/acompanhamento/${item.id}`;
                        navigator.clipboard.writeText(link);
                        alert("Link da família copiado!");
                      }}
                    >
                      <i className="fa-solid fa-share-nodes" style={{ marginRight: 6 }} />Link da família
                    </button>
                    <button
                      style={equipeAcionada
                        ? { ...outlineBtn, border: "1px solid rgba(234,179,8,0.4)", color: "#b45309" }
                        : primaryBtn
                      }
                      onClick={() => toggleEquipeAcionada(item.id, !equipeAcionada)}
                    >
                      <i className={`fa-solid ${equipeAcionada ? "fa-users-slash" : "fa-users"}`} style={{ marginRight: 6 }} />
                      {equipeAcionada ? "Cancelar acionamento" : "Acionar equipe"}
                    </button>
                    <button style={primaryBtn} onClick={() => openAttendance(item, "edit")}>
                      <i className="fa-solid fa-pen" style={{ marginRight: 6 }} />Editar
                    </button>
                  </div>
                  <button
                    style={{ ...outlineBtn, border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}
                    onClick={() => onDelete(item.id)}
                  >
                    <i className="fa-solid fa-trash" style={{ marginRight: 6 }} />Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
