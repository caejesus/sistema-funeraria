import React, { useState, useMemo } from "react";
import { styles } from "../styles/appStyles";
import { formatDateBR, formatMoney } from "../utils/format";

export function ServicosTab({
  atendimentos,
  openAttendance,
  onDelete,
  toggleEquipeAcionada,
  onNewAtendimento,
}) {
  const [attendanceSearch, setAttendanceSearch] = useState("");

  const filteredAttendimentos = useMemo(() => {
    const term = attendanceSearch.trim().toLowerCase();
    if (!term) return atendimentos;
    return atendimentos.filter((item) =>
      [item.numero, item.falecido, item.responsavelNome, item.cemiterio, item.motorista, item.atendente, item.unidade]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [attendanceSearch, atendimentos]);

  return (
    <section style={styles.moduleCard}>
      <div style={styles.moduleHeader}>
        <div>
          <h2 style={styles.moduleTitle}>Serviços</h2>
          <p style={styles.moduleSub}>
            Consulte os serviços salvos, abra novamente para PDF e edite quando precisar.
          </p>
        </div>
        <button style={styles.primaryBtn} onClick={onNewAtendimento}>
          Novo Atendimento
        </button>
      </div>

      <div style={styles.searchRow}>
        <div style={{ ...styles.field, marginBottom: 0, flex: 1 }}>
          <label style={styles.label}>Buscar serviço</label>
          <input
            style={styles.input}
            placeholder="Buscar por número, falecido, responsável, unidade, cemitério..."
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.infoRow}>
        <div style={styles.infoPill}>Total salvos: {atendimentos.length}</div>
        <div style={styles.infoPill}>Exibindo: {filteredAttendimentos.length}</div>
      </div>

      {filteredAttendimentos.length === 0 ? (
        <div style={styles.modulePlaceholder}>
          <div style={styles.modulePlaceholderTitle}>Nenhum serviço salvo</div>
          <div style={styles.modulePlaceholderText}>
            Finalize um atendimento para ele aparecer aqui como serviço salvo e ficar disponível para edição e geração de PDF.
          </div>
        </div>
      ) : (
        <div style={styles.recordsList}>
          {filteredAttendimentos.map((item) => (
            <div key={item.id} style={styles.recordCard}>
              <div style={styles.recordTop}>
                <div>
                  <div style={styles.recordNumber}>{item.numero}</div>
                  <div style={styles.recordName}>{item.falecido || "Sem nome informado"}</div>
                  <div style={styles.recordMeta}>
                    Data: {formatDateBR(item.dataAtendimento || "")} {item.horaAtendimento || ""}
                    {item.unidade ? ` • ${item.unidade}` : ""}
                    {item.sala ? ` • ${item.sala}` : ""}
                  </div>
                </div>
                <div style={styles.statusBadge}>{item.status}</div>
              </div>

              <div style={styles.recordGrid}>
                <div><strong>Responsável:</strong> {item.responsavelNome || "—"}</div>
                <div><strong>Cemitério:</strong> {item.cemiterio || "—"}</div>
                <div><strong>Motorista:</strong> {item.motorista || "—"}</div>
                <div><strong>Atendente:</strong> {item.atendente || "—"}</div>
                <div><strong>Local do óbito:</strong> {item.localObito || "—"}</div>
                <div><strong>Total:</strong> R$ {formatMoney(item.totalValue || 0)}</div>
                <div><strong>Equipe:</strong> {item.equipeAcionada ? "Acionada" : "Não acionada"}</div>
              </div>

              <div style={styles.recordActions}>
                <button style={styles.outlineDarkBtn} onClick={() => openAttendance(item, "preview")}>
                  Ver / PDF
                </button>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => {
                    const link = `${window.location.origin}/acompanhamento/${item.id}`;
                    navigator.clipboard.writeText(link);
                    alert("Link da família copiado!");
                  }}
                >
                  <i className="fa-solid fa-share-nodes" style={{ marginRight: 6 }} />Copiar link da família
                </button>
                <button
                  style={item.equipeAcionada ? styles.outlineDarkBtn : styles.primaryBtn}
                  onClick={() => toggleEquipeAcionada(item.id, !item.equipeAcionada)}
                >
                  {item.equipeAcionada ? "Cancelar acionamento" : "Acionar equipe"}
                </button>
                <button style={styles.primaryBtn} onClick={() => openAttendance(item, "edit")}>
                  Editar
                </button>
                <button style={styles.outlineDangerBtn} onClick={() => onDelete(item.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
