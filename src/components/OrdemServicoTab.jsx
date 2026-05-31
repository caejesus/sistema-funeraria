import React, { useState } from "react";
import { OS_STATUS, OS_PRIORIDADE } from "../constants";
import { styles } from "../styles/appStyles";
import { formatCep } from "../utils/format";

const STATUS_COLORS = {
  aguardando_remocao: { bg: "rgba(245,158,11,0.12)",  text: "#b45309", border: "rgba(245,158,11,0.28)" },
  equipe_deslocando:  { bg: "rgba(59,130,246,0.12)",  text: "#1d4ed8", border: "rgba(59,130,246,0.25)" },
  aguardando_local:   { bg: "rgba(139,92,246,0.12)",  text: "#7c3aed", border: "rgba(139,92,246,0.25)" },
  em_remocao:         { bg: "rgba(249,115,22,0.12)",  text: "#c2410c", border: "rgba(249,115,22,0.25)" },
  finalizada:         { bg: "rgba(34,197,94,0.12)",   text: "#15803d", border: "rgba(34,197,94,0.2)"  },
  cancelada:          { bg: "rgba(148,163,184,0.12)", text: "#64748b", border: "rgba(148,163,184,0.25)" },
};

function StatusBadge({ status }) {
  const label = OS_STATUS.find((s) => s.key === status)?.label || status;
  const color = STATUS_COLORS[status] || STATUS_COLORS.cancelada;
  return (
    <span style={{
      background: color.bg, color: color.text, border: `1px solid ${color.border}`,
      borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

const FORM_INICIAL = {
  falecido: "",
  sexo: "",
  peso: "",
  altura: "",
  local_obito: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  responsavel_nome: "",
  responsavel_telefone: "",
  motorista: "",
  carro: "",
  prioridade: "normal",
  observacoes: "",
};

function OSCard({ os, atualizarStatus, onCancelar, onConverter, readOnly = false }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const urgente = os.prioridade === "urgente";
  const d = os.dados || {};
  const isSvo = (os.local_obito || "").toUpperCase() === "SVO";

  async function handleStatusChange(e) {
    const novoStatus = e.target.value;
    if (!novoStatus) return;
    setUpdatingStatus(true);
    await atualizarStatus?.(os.record_id, novoStatus);
    setUpdatingStatus(false);
  }

  const localLabel = isSvo
    ? ["SVO", os.endereco, d.numero].filter(Boolean).join(" — ")
    : (os.local_obito || "");

  return (
    <div style={{ ...styles.recordCard, borderLeft: urgente ? "4px solid #f59e0b" : undefined }}>
      <div style={styles.recordTop}>
        <div>
          <div style={styles.recordNumber}>{os.numero}</div>
          <div style={styles.recordName}>{os.falecido || "Sem nome informado"}</div>
          <div style={styles.recordMeta}>
            {localLabel}
            {os.motorista ? ` • ${os.motorista}` : ""}
            {os.carro ? ` • ${os.carro}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={os.status} />
          {urgente && (
            <span style={{
              background: "rgba(245,158,11,0.15)", color: "#b45309",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800,
            }}>
              <i className="fa-solid fa-bolt" style={{ marginRight: 5 }} /> URGENTE
            </span>
          )}
        </div>
      </div>

      {(d.sexo || d.peso || d.altura || d.responsavel_nome || os.observacoes) && (
        <div style={{ ...styles.recordGrid, marginBottom: 10 }}>
          {d.sexo   && <div><strong>Sexo:</strong> {d.sexo}</div>}
          {d.peso   && <div><strong>Peso:</strong> {d.peso}</div>}
          {d.altura && <div><strong>Altura:</strong> {d.altura}</div>}
          {d.responsavel_nome && (
            <div>
              <strong>Responsável:</strong> {d.responsavel_nome}
              {d.responsavel_telefone ? ` (${d.responsavel_telefone})` : ""}
            </div>
          )}
          {os.observacoes && (
            <div style={{ gridColumn: "1 / -1" }}><strong>Obs:</strong> {os.observacoes}</div>
          )}
        </div>
      )}

      {!readOnly && (
        <div style={styles.recordActions}>
          {os.convertida_em ? (
            <span style={{
              background: "rgba(34,197,94,0.12)", color: "#15803d",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 700,
            }}>
              <i className="fa-solid fa-check" style={{ marginRight: 5 }} /> Convertida em atendimento
            </span>
          ) : (
            <>
              <select
                style={{ ...styles.input, width: "auto", padding: "10px 12px", flex: "1 1 200px", maxWidth: 260 }}
                value={os.status}
                onChange={handleStatusChange}
                disabled={updatingStatus || os.status === "cancelada"}
              >
                {OS_STATUS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              {os.status !== "cancelada" && os.status !== "finalizada" && (
                <>
                  <button style={styles.primaryBtn} onClick={() => onConverter?.(os.record_id)}>
                    <i className="fa-solid fa-arrow-right" style={styles.buttonIcon} /> Converter em Atendimento
                  </button>
                  <button style={styles.outlineDangerBtn} onClick={() => onCancelar?.(os.record_id)}>
                    Cancelar OS
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function OrdemServicoTab({ ordens, criarOrdem, atualizarStatus, cancelarOrdem, onConverter, settings }) {
  const [showForm, setShowForm] = useState(false);
  const [novaOS, setNovaOS] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  const ordensAtivas   = ordens.filter((o) => o.status !== "finalizada" && o.status !== "cancelada");
  const ordensHistorico = ordens.filter((o) => o.status === "finalizada"  || o.status === "cancelada");

  const isSvo = novaOS.local_obito === "SVO";

  function updateField(field, value) {
    setNovaOS((prev) => ({ ...prev, [field]: value }));
  }

  function handleLocalObitoChange(value) {
    setNovaOS((prev) => ({
      ...prev,
      local_obito: value,
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
    }));
    setCepError("");
  }

  async function buscarCepOs(cepFormatado) {
    const limpo = cepFormatado.replace(/\D/g, "");
    if (limpo.length !== 8) { setCepError(""); return; }
    setCepLoading(true);
    setCepError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError("CEP não encontrado."); return; }
      setNovaOS((prev) => ({ ...prev, endereco: data.logradouro || prev.endereco }));
    } catch {
      setCepError("Erro ao consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  function handleCepChange(value) {
    const formatted = formatCep(value);
    updateField("cep", formatted);
    if (formatted.replace(/\D/g, "").length === 8) {
      buscarCepOs(formatted);
    } else {
      setCepError("");
    }
  }

  async function handleCriar() {
    if (!novaOS.falecido.trim()) { alert("Informe o nome do falecido."); return; }
    setSalvando(true);
    const ok = await criarOrdem(novaOS);
    setSalvando(false);
    if (ok) { setNovaOS(FORM_INICIAL); setShowForm(false); setCepError(""); }
  }

  async function handleCancelar(recordId) {
    const motivo = window.prompt("Motivo do cancelamento (opcional):");
    if (motivo === null) return;
    await cancelarOrdem(recordId, motivo);
  }

  return (
    <section style={styles.moduleCard}>
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>Ordens de Serviço</h2>
          <p style={styles.moduleSub}>Gerencie remoções e ordens de serviço operacionais.</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Nova OS"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...styles.card, marginBottom: 24 }}>
          <h3 style={{ ...styles.cardTitle, fontSize: 18, marginBottom: 16 }}>Nova Ordem de Serviço</h3>
          <div style={styles.grid3}>

            {/* Falecido */}
            <div style={{ ...styles.fieldWide, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Falecido *</label>
              <input style={styles.input} value={novaOS.falecido} onChange={(e) => updateField("falecido", e.target.value)} />
            </div>

            {/* Sexo / Peso / Altura */}
            <div style={styles.field}>
              <label style={styles.label}>Sexo</label>
              <select style={styles.input} value={novaOS.sexo} onChange={(e) => updateField("sexo", e.target.value)}>
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Peso (ex: 70kg)</label>
              <input style={styles.input} value={novaOS.peso} placeholder="ex: 70kg" onChange={(e) => updateField("peso", e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Altura (ex: 1.75m)</label>
              <input style={styles.input} value={novaOS.altura} placeholder="ex: 1.75m" onChange={(e) => updateField("altura", e.target.value)} />
            </div>

            {/* Local do óbito */}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Local do óbito</label>
              <select style={styles.input} value={novaOS.local_obito} onChange={(e) => handleLocalObitoChange(e.target.value)}>
                <option value="">Selecione</option>
                {(settings?.hospitals || []).map((h) => <option key={h} value={h}>{h}</option>)}
                <option value="SVO">SVO — Serviço de Verificação de Óbito</option>
              </select>
            </div>

            {/* Campos SVO */}
            {isSvo && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>CEP</label>
                  <input
                    style={styles.input}
                    value={novaOS.cep}
                    placeholder="00000-000"
                    onChange={(e) => handleCepChange(e.target.value)}
                  />
                  {cepLoading && <span style={styles.helpText}>Consultando CEP...</span>}
                  {cepError  && <span style={styles.errorText}>{cepError}</span>}
                </div>
                <div style={styles.fieldWide}>
                  <label style={styles.label}>Endereço</label>
                  <input style={styles.input} value={novaOS.endereco} onChange={(e) => updateField("endereco", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Número</label>
                  <input style={styles.input} value={novaOS.numero} onChange={(e) => updateField("numero", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Complemento</label>
                  <input style={styles.input} value={novaOS.complemento} onChange={(e) => updateField("complemento", e.target.value)} />
                </div>
              </>
            )}

            {/* Responsável */}
            <div style={styles.field}>
              <label style={styles.label}>Responsável nome</label>
              <input style={styles.input} value={novaOS.responsavel_nome} onChange={(e) => updateField("responsavel_nome", e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Responsável telefone</label>
              <input style={styles.input} value={novaOS.responsavel_telefone} onChange={(e) => updateField("responsavel_telefone", e.target.value)} />
            </div>

            {/* Motorista / Carro / Prioridade */}
            <div style={styles.field}>
              <label style={styles.label}>Motorista</label>
              <select style={styles.input} value={novaOS.motorista} onChange={(e) => updateField("motorista", e.target.value)}>
                <option value="">Selecione</option>
                {(settings?.drivers || []).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Carro</label>
              <select style={styles.input} value={novaOS.carro} onChange={(e) => updateField("carro", e.target.value)}>
                <option value="">Selecione</option>
                {(settings?.cars || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Prioridade</label>
              <select style={styles.input} value={novaOS.prioridade} onChange={(e) => updateField("prioridade", e.target.value)}>
                {OS_PRIORIDADE.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Observações */}
            <div style={{ ...styles.fieldWide, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Observações</label>
              <textarea
                style={{ ...styles.input, minHeight: 70, resize: "vertical" }}
                value={novaOS.observacoes}
                onChange={(e) => updateField("observacoes", e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button style={styles.outlineDarkBtn} onClick={() => { setShowForm(false); setNovaOS(FORM_INICIAL); setCepError(""); }}>
              Cancelar
            </button>
            <button style={styles.primaryBtn} onClick={handleCriar} disabled={salvando}>
              {salvando ? "Salvando..." : "Criar OS"}
            </button>
          </div>
        </div>
      )}

      <div style={styles.infoRow}>
        <div style={styles.infoPill}>Ativas: {ordensAtivas.length}</div>
        <div style={styles.infoPill}>Total: {ordens.length}</div>
      </div>

      {ordensAtivas.length === 0 ? (
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Nenhuma OS ativa</div>
          <div style={styles.modulePlaceholderText}>
            Crie uma nova Ordem de Serviço para registrar uma remoção pendente.
          </div>
        </div>
      ) : (
        <div style={styles.recordsList}>
          {ordensAtivas.map((os) => (
            <OSCard
              key={os.record_id}
              os={os}
              atualizarStatus={atualizarStatus}
              onCancelar={handleCancelar}
              onConverter={onConverter}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button
          style={{ ...styles.outlineDarkBtn, width: "100%", marginBottom: 12 }}
          onClick={() => setShowHistorico((v) => !v)}
        >
          {showHistorico ? "Ocultar histórico" : `Ver histórico (${ordensHistorico.length})`}
        </button>
        {showHistorico && ordensHistorico.length > 0 && (
          <div style={styles.recordsList}>
            {ordensHistorico.map((os) => <OSCard key={os.record_id} os={os} readOnly />)}
          </div>
        )}
        {showHistorico && ordensHistorico.length === 0 && (
          <div style={{ ...styles.modulePlaceholder, minHeight: "auto", padding: 16 }}>
            <div style={styles.modulePlaceholderText}>Nenhum registro no histórico ainda.</div>
          </div>
        )}
      </div>
    </section>
  );
}
