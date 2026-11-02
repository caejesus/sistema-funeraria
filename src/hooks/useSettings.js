import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_SETTINGS, SETTINGS_FIELDS, STORAGE_KEYS } from "../constants";
import { COLUNAS_USUARIO, chamarUsuarios } from "../lib/auth";
import { normalizeRole } from "../utils/attendance";
import { loadStorage } from "../utils/storage";

export function useSettings() {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    bootstrapAppData();
  }, []);

  async function bootstrapAppData() {
    setBootLoading(true);
    const localSettings = loadStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);

    try {
      const { data: remoteUsers, error: usersError } = await supabase
        .from("app_users")
        .select(COLUNAS_USUARIO)
        .order("name", { ascending: true });

      if (usersError) throw usersError;

      const finalUsers = remoteUsers || [];

      const { data: remoteSettingsRows, error: settingsError } = await supabase
        .from("app_settings")
        .select("*");
      if (settingsError) throw settingsError;

      let finalSettings = { ...DEFAULT_SETTINGS };

      if (remoteSettingsRows && remoteSettingsRows.length) {
        SETTINGS_FIELDS.forEach((key) => {
          const row = remoteSettingsRows.find((item) => item.key === key);
          finalSettings[key] = Array.isArray(row?.items) ? row.items : DEFAULT_SETTINGS[key] || [];
        });
      } else {
        const seedSettings = SETTINGS_FIELDS.map((key) => ({
          key,
          items:
            Array.isArray(localSettings?.[key]) && localSettings[key].length
              ? localSettings[key]
              : DEFAULT_SETTINGS[key] || [],
        }));
        const { error: seedSettingsError } = await supabase
          .from("app_settings")
          .upsert(seedSettings, { onConflict: "key" });
        if (seedSettingsError) throw seedSettingsError;
        SETTINGS_FIELDS.forEach((key) => {
          finalSettings[key] = seedSettings.find((item) => item.key === key)?.items || [];
        });
      }

      setUsers((finalUsers || []).map((u) => ({ ...u, role: normalizeRole(u.role) })));
      setSettings(finalSettings);
    } catch (error) {
      console.error("Erro ao carregar usuários/configurações:", error);
      setSettings(localSettings || DEFAULT_SETTINGS);
      alert(
        "Não foi possível carregar usuários e configurações do banco. Verifique a internet e recarregue a página."
      );
    } finally {
      setBootLoading(false);
    }
  }

  async function saveSettingListToSupabase(key, list) {
    const uniqueList = [
      ...new Set((list || []).map((item) => String(item).trim()).filter(Boolean)),
    ];
    const { error } = await supabase
      .from("app_settings")
      .upsert([{ key, items: uniqueList }], { onConflict: "key" });
    if (error) {
      console.error(`Erro ao salvar configuração ${key}:`, error);
      alert("Erro ao salvar configuração no banco.");
      return false;
    }
    setSettings((prev) => ({ ...prev, [key]: uniqueList }));
    return true;
  }

  async function addSettingItem(key, value) {
    const clean = value.trim();
    if (!clean) return false;
    if ((settings[key] || []).includes(clean)) return false;
    const nextList = [...(settings[key] || []), clean];
    return await saveSettingListToSupabase(key, nextList);
  }

  async function removeSettingItem(key, value) {
    const nextList = (settings[key] || []).filter((item) => item !== value);
    await saveSettingListToSupabase(key, nextList);
  }

  async function addUser(userData) {
    if (!userData.name || !userData.login || !userData.password) {
      alert("Preencha nome, login e senha.");
      return false;
    }
    const r = await chamarUsuarios({
      acao: "criar",
      name: userData.name,
      login: userData.login,
      senha: userData.password,
      role: userData.role,
      funcoes: Array.isArray(userData.funcoes) ? userData.funcoes : [],
    });
    if (!r.ok) {
      alert(r.erro || "Erro ao salvar usuário.");
      return false;
    }
    setUsers((prev) => [...prev, { ...r.usuario, role: normalizeRole(r.usuario.role) }]);
    return true;
  }

  // dados: { name?, role?, funcoes?, password? } — password vazio mantém a senha atual
  async function updateUser(id, dados) {
    const r = await chamarUsuarios({
      acao: "alterar",
      id,
      name: dados.name,
      role: dados.role,
      funcoes: dados.funcoes,
      senha: dados.password || "",
    });
    if (!r.ok) {
      alert(r.erro || "Erro ao atualizar colaborador.");
      return false;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...r.usuario, role: normalizeRole(r.usuario.role) } : u)));
    return true;
  }

  async function removeUser(id) {
    const user = users.find((u) => u.id === id);
    if (user?.login === "admin") {
      alert("O admin padrão não pode ser removido.");
      return;
    }
    if (!window.confirm(`Remover o acesso de ${user?.name || "este colaborador"}?`)) return;
    const r = await chamarUsuarios({ acao: "excluir", id });
    if (!r.ok) {
      alert(r.erro || "Erro ao remover usuário.");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return {
    users,
    settings,
    bootLoading,
    addSettingItem,
    removeSettingItem,
    addUser,
    updateUser,
    removeUser,
  };
}
