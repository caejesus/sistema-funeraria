import React from "react";
import { styles } from "../styles/appStyles";

export function ServicosModal({ services, toggleService, updateService, isDark, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        <div style={styles.modalHead}>
          <h2 style={{ margin: 0, color: "var(--brand-accent)" }}>Selecionar Serviços</h2>
          <button style={styles.outlineDarkBtn} onClick={onClose}>
            Fechar
          </button>
        </div>

        <div style={styles.servicesGrid}>
          {services.map((item, index) => (
            <div
              key={item.name}
              style={{
                ...styles.serviceCard,
                borderColor: item.checked ? "var(--brand-accent)" : "var(--border-soft)",
                background: item.checked
                  ? isDark ? "#172033" : "#F0FBFD"
                  : "var(--card-bg-soft)",
              }}
            >
              <div style={styles.serviceTop}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleService(index)}
                  />
                  {item.name}
                </label>
              </div>

              {item.type === "quantidade_valor" && (
                <div style={styles.grid2Simple}>
                  <div style={styles.field}>
                    <label style={styles.label}>Quantidade</label>
                    <input
                      style={{ ...styles.input, background: isDark ? "#0f172a" : "#ffffff", color: isDark ? "#e5e7eb" : "#17313A", borderColor: isDark ? "#334155" : "#cbd5e1" }}
                      value={item.qty}
                      onChange={(e) => updateService(index, "qty", e.target.value)}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Valor</label>
                    <input
                      style={{ ...styles.input, background: isDark ? "#0f172a" : "#ffffff", color: isDark ? "#e5e7eb" : "#17313A", borderColor: isDark ? "#334155" : "#cbd5e1" }}
                      value={item.value}
                      onChange={(e) => updateService(index, "value", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {item.type === "valor_only" && (
                <div style={styles.field}>
                  <label style={styles.label}>Valor</label>
                  <input
                    style={{ ...styles.input, background: isDark ? "#0f172a" : "#ffffff", color: isDark ? "#e5e7eb" : "#17313A", borderColor: isDark ? "#334155" : "#cbd5e1" }}
                    value={item.value}
                    onChange={(e) => updateService(index, "value", e.target.value)}
                  />
                </div>
              )}

              {item.name === "COROA DE FLORES" && (
                <div style={styles.field}>
                  <label style={styles.label}>Frase</label>
                  <input
                    style={{ ...styles.input, background: isDark ? "#0f172a" : "#ffffff", color: isDark ? "#e5e7eb" : "#17313A", borderColor: isDark ? "#334155" : "#cbd5e1" }}
                    value={item.note}
                    onChange={(e) => updateService(index, "note", e.target.value)}
                  />
                </div>
              )}

              {item.name === "OUTRAS DESPESAS" && (
                <div style={styles.field}>
                  <label style={styles.label}>Descrição</label>
                  <input
                    style={{ ...styles.input, background: isDark ? "#0f172a" : "#ffffff", color: isDark ? "#e5e7eb" : "#17313A", borderColor: isDark ? "#334155" : "#cbd5e1" }}
                    value={item.note}
                    onChange={(e) => updateService(index, "note", e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
