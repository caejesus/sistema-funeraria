import React, { useState } from "react";
import { styles } from "../styles/appStyles";
import { USER_ROLES, FUNCOES_OPERACIONAIS } from "../constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  return (
    <span style={{
      background: "var(--info-pill-bg)",
      color: "var(--info-pill-text)",
      border: "1px solid var(--border-soft)",
      borderRadius: 999,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 700,
    }}>
      {USER_ROLES.find((r) => r.value === role)?.label || role}
    </span>
  );
}

function FuncaoTag({ value }) {
  const label = FUNCOES_OPERACIONAIS.find((f) => f.value === value)?.label;
  if (!label) return null;
  return (
    <span style={{
      background: "rgba(38,177,196,0.08)",
      color: "var(--brand-accent)",
      borderRadius: 999,
      padding: "2px 8px",
      fontSize: 10,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

function FuncoesCheckboxes({ selected, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginTop: 8 }}>
      {FUNCOES_OPERACIONAIS.map((f) => (
        <label key={f.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--text-soft)" }}>
          <input
            type="checkbox"
            checked={(selected || []).includes(f.value)}
            onChange={() => {
              const next = (selected || []).includes(f.value)
                ? selected.filter((v) => v !== f.value)
                : [...(selected || []), f.value];
              onChange(next);
            }}
          />
          {f.label}
        </label>
      ))}
    </div>
  );
}

// ─── Accordion config ─────────────────────────────────────────────────────────

const ACCORDIONS = [
  { key: "hospitals",    label: "Hospitais / Locais de Óbito", hasHospital: true, placeholder: "Nome reduzido (ex: HPS Platão Araújo)" },
  { key: "cemeteries",   label: "Cemitérios",                  hasAddress: true,  placeholder: "Nome do cemitério" },
  { key: "coffinColors", label: "Cores de Urna",               hasAddress: false, upper: true },
  { key: "cars",         label: "Carros",                      hasAddress: false, hasCar: true, upper: true, placeholder: "Modelo (ex: STRADA)" },
];

const EMPTY_USER = { name: "", login: "", password: "", role: "ATENDENTE", funcoes: [] };

// ─── Main component ───────────────────────────────────────────────────────────

export function ConfigTab({ users, settings, addUser, removeUser, updateUser, addSettingItem, removeSettingItem }) {
  const [newUser, setNewUser] = useState(EMPTY_USER);
  const [editingUser, setEditingUser] = useState(null);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [newItems, setNewItems] = useState({ hospitals: "", hospitalMaps: "", cemeteries: "", cemeteryAddress: "", coffinColors: "", cars: "", carPlaca: "" });

  async function handleAddUser() {
    const ok = await addUser(newUser);
    if (ok) setNewUser(EMPTY_USER);
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    const ok = await updateUser(editingUser.id, {
      name:    editingUser.name,
      password: editingUser.password,
      role:    editingUser.role,
      funcoes: editingUser.funcoes || [],
    });
    if (ok) setEditingUser(null);
  }

  async function handleAddItem(key) {
    if (key === "hospitals") {
      const nome = (newItems.hospitals || "").trim();
      const maps = (newItems.hospitalMaps || "").trim();
      if (!nome) return;
      const value = maps ? `${nome}|${maps}` : nome;
      const ok = await addSettingItem(key, value);
      if (ok) setNewItems((p) => ({ ...p, hospitals: "", hospitalMaps: "" }));
    } else if (key === "cemeteries") {
      const nome = (newItems.cemeteries || "").trim();
      const addr = (newItems.cemeteryAddress || "").trim();
      if (!nome) return;
      const value = addr ? `${nome}|${addr}` : nome;
      const ok = await addSettingItem(key, value);
      if (ok) setNewItems((p) => ({ ...p, cemeteries: "", cemeteryAddress: "" }));
    } else if (key === "cars") {
      const modelo = (newItems.cars || "").trim().toUpperCase();
      const placa  = (newItems.carPlaca || "").trim().toUpperCase();
      if (!modelo) return;
      const value = placa ? `${modelo} - ${placa}` : modelo;
      const ok = await addSettingItem(key, value);
      if (ok) setNewItems((p) => ({ ...p, cars: "", carPlaca: "" }));
    } else {
      const raw = (newItems[key] || "").trim();
      if (!raw) return;
      const acc = ACCORDIONS.find((a) => a.key === key);
      const value = acc?.upper ? raw.toUpperCase() : raw;
      const ok = await addSettingItem(key, value);
      if (ok) setNewItems((p) => ({ ...p, [key]: "" }));
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

      {/* ── Colaboradores ─────────────────────────────────────────────────── */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Colaboradores</h2>

        {/* New user form */}
        <div style={{ marginBottom: 20, padding: 16, background: "var(--card-bg-alt)", borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
            Novo colaborador
          </div>
          <div style={styles.grid2Simple}>
            <div style={styles.field}>
              <label style={styles.label}>Nome</label>
              <input style={styles.input} value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Login</label>
              <input style={styles.input} value={newUser.login} onChange={(e) => setNewUser((p) => ({ ...p, login: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Senha</label>
              <input style={styles.input} value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Perfil de acesso</label>
              <select style={styles.input} value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Funções operacionais</label>
            <FuncoesCheckboxes
              selected={newUser.funcoes}
              onChange={(next) => setNewUser((p) => ({ ...p, funcoes: next }))}
            />
          </div>
          <button style={{ ...styles.primaryBtn, marginTop: 14 }} onClick={handleAddUser}>
            <i className="fa-solid fa-user-plus" style={{ marginRight: 6 }} />Adicionar colaborador
          </button>
        </div>

        {/* User list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((u) =>
            editingUser?.id === u.id ? (
              /* Edit inline */
              <div key={u.id} style={{ ...styles.listItem, flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Editando: {u.login}
                </div>
                <div style={styles.grid2Simple}>
                  <div style={styles.field}>
                    <label style={styles.label}>Nome</label>
                    <input style={styles.input} value={editingUser.name} onChange={(e) => setEditingUser((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Senha</label>
                    <input style={styles.input} value={editingUser.password} onChange={(e) => setEditingUser((p) => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Perfil de acesso</label>
                    <select style={styles.input} value={editingUser.role} onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))}>
                      {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={styles.label}>Funções operacionais</label>
                  <FuncoesCheckboxes
                    selected={editingUser.funcoes}
                    onChange={(next) => setEditingUser((p) => ({ ...p, funcoes: next }))}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={styles.primaryBtn} onClick={handleSaveEdit}>
                    <i className="fa-solid fa-check" style={{ marginRight: 6 }} />Salvar
                  </button>
                  <button style={styles.outlineDarkBtn} onClick={() => setEditingUser(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* Normal row */
              <div key={u.id} style={styles.listItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{u.login}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <RoleBadge role={u.role} />
                    {(u.funcoes || []).map((f) => <FuncaoTag key={f} value={f} />)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button style={styles.outlineDarkBtn} onClick={() => setEditingUser({ ...u, funcoes: u.funcoes || [] })}>
                    <i className="fa-solid fa-pen" style={{ marginRight: 5 }} />Editar
                  </button>
                  {u.login !== "admin" && (
                    <button style={styles.outlineDangerBtn} onClick={() => removeUser(u.id)}>
                      Remover
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* ── Cadastros dinâmicos ────────────────────────────────────────────── */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cadastros dinâmicos</h2>

        {ACCORDIONS.map(({ key, label, hasAddress, hasHospital, hasCar, placeholder }) => {
          const isOpen = openAccordion === key;
          const items = settings[key] || [];
          return (
            <div key={key} style={{ marginBottom: 10, border: "1px solid var(--border-soft)", borderRadius: 14, overflow: "hidden" }}>
              <button
                type="button"
                style={{
                  width: "100%",
                  background: isOpen ? "var(--card-bg-alt)" : "none",
                  border: "none",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-main)",
                  textAlign: "left",
                }}
                onClick={() => setOpenAccordion(isOpen ? null : key)}
              >
                <span>{label}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                  {items.length} item{items.length !== 1 ? "s" : ""}
                  <i className={`fa-solid fa-chevron-${isOpen ? "up" : "down"}`} />
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border-soft)" }}>
                  {/* Add form */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, marginBottom: 10 }}>
                    <input
                      style={{ ...styles.input, flex: hasCar ? 2 : 1, minWidth: 130 }}
                      placeholder={placeholder || "Novo item"}
                      value={newItems[key] || ""}
                      onChange={(e) => setNewItems((p) => ({ ...p, [key]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && !hasAddress && !hasCar && !hasHospital && handleAddItem(key)}
                    />
                    {hasHospital && (
                      <input
                        style={{ ...styles.input, flex: 1, minWidth: 160 }}
                        placeholder="Nome completo para Maps (opcional)"
                        value={newItems.hospitalMaps || ""}
                        onChange={(e) => setNewItems((p) => ({ ...p, hospitalMaps: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAddItem(key)}
                      />
                    )}
                    {hasAddress && (
                      <input
                        style={{ ...styles.input, flex: 1, minWidth: 130 }}
                        placeholder="Endereço (opcional)"
                        value={newItems.cemeteryAddress || ""}
                        onChange={(e) => setNewItems((p) => ({ ...p, cemeteryAddress: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAddItem(key)}
                      />
                    )}
                    {hasCar && (
                      <input
                        style={{ ...styles.input, flex: 1, minWidth: 90 }}
                        placeholder="Placa (ex: JAV9I91)"
                        value={newItems.carPlaca || ""}
                        onChange={(e) => setNewItems((p) => ({ ...p, carPlaca: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAddItem(key)}
                      />
                    )}
                    <button style={styles.primaryBtn} onClick={() => handleAddItem(key)}>
                      Adicionar
                    </button>
                  </div>

                  {/* Items list */}
                  {items.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
                      Nenhum item cadastrado
                    </div>
                  ) : (
                    items.map((rawItem) => {
                      let displayName, displaySub;
                      if (key === "hospitals") {
                        [displayName, displaySub] = rawItem.split("|");
                      } else if (key === "cemeteries") {
                        [displayName, displaySub] = rawItem.split("|");
                      } else if (key === "cars") {
                        const dashIdx = rawItem.indexOf(" - ");
                        displayName = dashIdx >= 0 ? rawItem.slice(0, dashIdx) : rawItem;
                        displaySub  = dashIdx >= 0 ? rawItem.slice(dashIdx + 3) : "";
                      } else {
                        displayName = rawItem;
                        displaySub  = "";
                      }
                      return (
                        <div key={rawItem} style={{ ...styles.listItem, padding: "10px 12px", marginBottom: 6 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "var(--text-main)" }}>{displayName}</div>
                            {displaySub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{displaySub}</div>}
                          </div>
                          <button style={styles.outlineDangerBtn} onClick={() => removeSettingItem(key, rawItem)}>
                            Remover
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
