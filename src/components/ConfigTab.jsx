import React, { useState } from "react";
import { styles } from "../styles/appStyles";

export function ConfigTab({ users, settings, addUser, removeUser, addSettingItem, removeSettingItem }) {
  const [newUser, setNewUser] = useState({ name: "", login: "", password: "", role: "ATENDENTE" });
  const [newHospital, setNewHospital] = useState("");
  const [newCemetery, setNewCemetery] = useState("");
  const [newCoffinColor, setNewCoffinColor] = useState("");
  const [newTechnician, setNewTechnician] = useState("");
  const [newAttendant, setNewAttendant] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newCar, setNewCar] = useState("");
  const [newSupport, setNewSupport] = useState("");
  const [newEmbarque, setNewEmbarque] = useState("");

  async function handleAddUser() {
    const success = await addUser(newUser);
    if (success) setNewUser({ name: "", login: "", password: "", role: "ATENDENTE" });
  }

  async function handleAddItem(key, value, setValue, transform) {
    const val = transform ? transform(value) : value;
    const success = await addSettingItem(key, val);
    if (success) setValue("");
  }

  return (
    <div style={styles.grid2}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Usuários</h2>

        <div style={styles.grid2Simple}>
          <div style={styles.field}>
            <label style={styles.label}>Nome</label>
            <input
              style={styles.input}
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Login</label>
            <input
              style={styles.input}
              value={newUser.login}
              onChange={(e) => setNewUser((prev) => ({ ...prev, login: e.target.value }))}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Senha</label>
            <input
              style={styles.input}
              value={newUser.password}
              onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Função</label>
            <select
              style={styles.input}
              value={newUser.role}
              onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="ADM">ADM</option>
              <option value="ATENDENTE">Atendente</option>
              <option value="EQUIPE">Equipe</option>
            </select>
          </div>
        </div>

        <button style={styles.primaryBtn} onClick={handleAddUser}>
          Adicionar usuário
        </button>

        <div style={{ marginTop: 16 }}>
          {users.map((u) => (
            <div key={u.id} style={styles.listItem}>
              <div>
                <strong>{u.name}</strong> — {u.login} ({u.role})
              </div>
              {u.login !== "admin" && (
                <button style={styles.outlineDarkBtn} onClick={() => removeUser(u.id)}>
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cadastros dinâmicos</h2>

        {[
          { label: "Novo hospital / local do óbito", key: "hospitals", value: newHospital, setValue: setNewHospital },
          { label: "Novo cemitério", key: "cemeteries", value: newCemetery, setValue: setNewCemetery },
          { label: "Nova cor de urna", key: "coffinColors", value: newCoffinColor, setValue: setNewCoffinColor, transform: (v) => v.toUpperCase() },
          { label: "Novo técnico", key: "technicians", value: newTechnician, setValue: setNewTechnician, transform: (v) => v.toUpperCase() },
          { label: "Novo apoio", key: "supports", value: newSupport, setValue: setNewSupport, transform: (v) => v.toUpperCase() },
          { label: "Novo atendente", key: "attendants", value: newAttendant, setValue: setNewAttendant, transform: (v) => v.toUpperCase() },
          { label: "Novo motorista", key: "drivers", value: newDriver, setValue: setNewDriver, transform: (v) => v.toUpperCase() },
          { label: "Novo carro", key: "cars", value: newCar, setValue: setNewCar, transform: (v) => v.toUpperCase(), placeholder: "Ex: STRADA - QWE1A23" },
          { label: "Novo embarque", key: "embarques", value: newEmbarque, setValue: setNewEmbarque, transform: (v) => v.toUpperCase() },
        ].map(({ label, key, value, setValue, transform, placeholder }) => (
          <div key={key}>
            <div style={styles.field}>
              <label style={styles.label}>{label}</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={value}
                  placeholder={placeholder || ""}
                  onChange={(e) => setValue(e.target.value)}
                />
                <button
                  style={styles.primaryBtn}
                  onClick={() => handleAddItem(key, value, setValue, transform)}
                >
                  Adicionar
                </button>
              </div>
            </div>
            {(settings[key] || []).map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeSettingItem(key, item)}
                >
                  Remover
                </button>
              </div>
            ))}
            <div style={{ height: 18 }} />
          </div>
        ))}
      </section>
    </div>
  );
}
