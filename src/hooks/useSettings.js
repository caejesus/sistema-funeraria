import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_USERS, DEFAULT_SETTINGS, SETTINGS_FIELDS, STORAGE_KEYS } from "../constants";
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
    const localUsers = loadStorage(STORAGE_KEYS.users, DEFAULT_USERS);
    const localSettings = loadStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);

    try {
      const { data: remoteUsers, error: usersError } = await supabase
        .from("app_users")
        .select("*")
        .order("name", { ascending: true });

      if (usersError) throw usersError;

      let finalUsers = remoteUsers || [];

      if (!finalUsers.length) {
        const seedUsers = (localUsers && localUsers.length ? localUsers : DEFAULT_USERS).map(
          (user) => ({
            id: String(user.id || Date.now()),
            name: user.name || "",
            login: user.login || "",
            password: user.password || "",
            role: normalizeRole(user.role || "ATENDENTE"),
          })
        );
        const { error: seedUsersError } = await supabase
          .from("app_users")
          .upsert(seedUsers, { onConflict: "login" });
        if (seedUsersError) throw seedUsersError;
        finalUsers = seedUsers;
      }

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
      setUsers((localUsers || DEFAULT_USERS).map((u) => ({ ...u, role: normalizeRole(u.role) })));
      setSettings(localSettings || DEFAULT_SETTINGS);
      alert(
        "Não foi possível sincronizar usuários e configurações com o banco. O sistema usará os dados locais deste navegador."
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
    if (users.some((u) => u.login === userData.login)) {
      alert("Esse login já existe.");
      return false;
    }
    const userToSave = { ...userData, id: String(Date.now()) };
    const { error } = await supabase.from("app_users").insert([userToSave]);
    if (error) {
      console.error("Erro ao salvar usuário:", error);
      alert("Erro ao salvar usuário no banco.");
      return false;
    }
    setUsers((prev) => [...prev, userToSave]);
    return true;
  }

  async function removeUser(id) {
    const user = users.find((u) => u.id === id);
    if (user?.login === "admin") {
      alert("O admin padrão não pode ser removido.");
      return;
    }
    const { error } = await supabase.from("app_users").delete().eq("id", id);
    if (error) {
      console.error("Erro ao remover usuário:", error);
      alert("Erro ao remover usuário do banco.");
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
    removeUser,
  };
}
