import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { supabase } from "./lib/supabaseClient.js";

const STORAGE_KEYS = {
  users: "sf_users_v3",
  settings: "sf_settings_v3",
  session: "sf_session_v3",
  attendances: "sf_attendances_v1",
};

const OPERATION_STAGES = [
  { key: "atendimento", label: "Atendimento" },
  { key: "remocao", label: "Remoção" },
  { key: "procedimentoClinico", label: "Procedimento Clínico" },
  { key: "ornamentacao", label: "Ornamentação" },
  { key: "entrega", label: "Entrega" },
  { key: "velorio", label: "Velório" },
  { key: "sepultamento", label: "Sepultamento" },
];

const TRANSPORT_STAGE_KEYS = ["remocao", "entrega", "sepultamento"];

function isTransportStage(stageKey) {
  return TRANSPORT_STAGE_KEYS.includes(stageKey);
}

const DEFAULT_USERS = [
  {
    id: "1",
    name: "Administrador",
    login: "admin",
    password: "10121410",
    role: "ADM",
  },
];

const DEFAULT_SETTINGS = {
  hospitals: [
    "Hospital 28 de Agosto",
    "Hospital João Lúcio",
    "SPA Zona Norte",
  ],
  cemeteries: ["São João Batista", "Nossa Senhora Aparecida"],
  coffinColors: ["MOGNO", "RAJADA"],
  technicians: [],
  attendants: [],
  drivers: [],
  cars: [],
  supports: [],
};

const SETTINGS_FIELDS = [
  "hospitals",
  "cemeteries",
  "coffinColors",
  "technicians",
  "attendants",
  "drivers",
  "cars",
  "supports",
];

const FUNERAL_UNITS = {
  "Unidade Cachoeirinha": [
    "Sala Orquídea",
    "Sala Bromélia",
    "Sala Tulipa",
    "Sala Lírio",
    "Área externa",
  ],
  "Unidade Santo Antônio": ["Sala 01", "Sala 02", "Sala 03", "Sala 04"],
  "Unidade Cidade Nova": ["Sala 01", "Sala 02"],
};

const SERVICE_NAMES = [
  "URNA",
  "CARRO P/ REMOÇÃO",
  "CARRO P/ CORTEJO",
  "PARAMENTAÇÃO",
  "HIGIENIZAÇÃO DO CORPO",
  "VÉU",
  "ORNAMENTAÇÃO COM FLORES P/ URNA",
  "SALA DE VELÓRIO",
  "TANATOPRAXIA (CONSERVAÇÃO DO CORPO)",
  "LENÇO DE MÃO",
  "ÔNIBUS",
  "COROA DE FLORES",
  "TAXA DE SEPULTAMENTO MUNICIPAL",
  "DOCUMENTAÇÃO",
  "CERIMONIAL FÚNEBRE",
  "ARRANJO DE FLORES",
  "BUQUÊ DE FLORES",
  "LIVRO DE PRESENÇA",
  "TRANSLADO AÉREO",
  "TRANSLADO TERRESTRE",
  "TRANSLADO FLUVIAL",
  "KIT CAFÉ (SÓCIO)",
  "ROUPA",
  "ZINCO",
  "INVOL",
  "CAIXA DE VIAGEM",
  "OUTRAS DESPESAS",
];

const initialServices = SERVICE_NAMES.map((name) => ({
  name,
  checked: false,
  qty: "",
  value: "",
  note: "",
}));

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function createOperationStages() {
  return OPERATION_STAGES.reduce((acc, stage) => {
    acc[stage.key] = {
      status: "nao_iniciado",
      start: "",
      end: "",
      driver: "",
      car: "",
      attendant: "",
      technician: "",
      support: "",
    };
    return acc;
  }, {});
}

function getOperationStatusLabel(status) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "finalizado") return "Finalizado";
  return "Não iniciado";
}

function getAttendanceOperationalStatus(stages = {}) {
  const values = OPERATION_STAGES.map((stage) => stages?.[stage.key]?.status || "nao_iniciado");
  if (values.length && values.every((value) => value === "finalizado")) {
    return "Concluído";
  }
  if (values.some((value) => value === "em_andamento")) {
    return "Em andamento";
  }
  if (values.some((value) => value === "finalizado")) {
    return "Em progresso";
  }
  return "Aguardando início";
}

function formatDateBR(date) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function formatCep(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 8);
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
}

function formatMoney(value) {
  const clean = String(value).replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  if (Number.isNaN(n) || value === "") return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moneyToNumber(value) {
  if (!value) return 0;
  const clean = String(value).replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isNaN(n) ? 0 : n;
}

function getInitialForm() {
  return {
    falecido: "",
    localObito: "",
    cemiterio: "",
    dataSaida: todayDate(),
    horaSaida: currentTime(),
    horaAtendimento: currentTime(),
    dataAtendimento: todayDate(),
    chegouClinica: "",
    inicioAs: "",
    tipoPlano: "particular",
    plano: "",
    codigo: "",
    dependente: "",

    responsavelNome: "",
    responsavelRg: "",
    responsavelCpf: "",
    responsavelCep: "",
    responsavelEndereco: "",
    responsavelNumero: "",
    responsavelBairro: "",
    responsavelCelular1: "",
    responsavelCelular2: "",

    velorioTipo: "funeraria",
    velorioNomeLocal: "",
    velorioCep: "",
    velorioEndereco: "",
    velorioNumero: "",
    velorioBairro: "",
    velorioUnidade: "",
    velorioSala: "",

    atendenteGeral: "",
    carroGeral: "",

    atendenteRemocao: "",
    Remocao: "",
    carroRemocao: "",

    atendenteEntrega: "",
    Entrega: "",
    carroEntrega: "",

    atendenteSepultamento: "",
    Sepultamento: "",
    carroSepultamento: "",

    parentesco: "",

    necropsia: "nao",
    veioVestido: "sim",
    roupaDestino: "",
    retirarEsmalte: "nao",

    barbear: "sim",
    bigode: "nao",
    cavanhaque: "nao",

    maquiagem: "sim",
    maquiagemTipo: "leve",

    ornamentacao: "sim",
    tipoFlor: "",

    joias: "nao",
    joiasQuais: "",

    roupaEntreguePara: "motorista",

    tempoVelorioValor: "",
    tempoVelorioUnidade: "horas",
    horarioVelorio: "",

    religiao: "católico",
    tecnico: "",
    apoio: "",
    motorista: "",

    modeloUrna: "0X",
    refUrna: "",
    corUrna: "",

    observacaoTermo: "",
  };
}


function getThemeVars(isDark) {
  if (isDark) {
    return {
      "--page-bg": "linear-gradient(135deg, #0f172a, #111827)",
      "--login-bg": "linear-gradient(135deg, #0f172a, #111827)",
      "--text-main": "#e5e7eb",
      "--text-soft": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--brand-text": "#e2e8f0",
      "--brand-accent": "#7dd3fc",
      "--card-bg": "#111827",
      "--card-bg-soft": "#0f172a",
      "--card-bg-alt": "#172033",
      "--module-bg": "#111827",
      "--input-bg": "#0f172a",
      "--input-border": "#334155",
      "--input-text": "#e5e7eb",
      "--border-soft": "#334155",
      "--header-bg": "rgba(15,23,42,0.86)",
      "--header-box-bg": "rgba(30,41,59,0.82)",
      "--tab-bg": "#0f172a",
      "--tab-text": "#cbd5e1",
      "--tab-border": "#334155",
      "--tab-active-bg": "#0ea5e9",
      "--tab-active-text": "#f8fafc",
      "--primary-btn": "#0ea5e9",
      "--primary-btn-text": "#f8fafc",
      "--outline-bg": "#1e293b",
      "--outline-text": "#e2e8f0",
      "--outline-border": "#334155",
      "--danger-text": "#fecaca",
      "--danger-border": "#7f1d1d",
      "--info-pill-bg": "#0f172a",
      "--info-pill-text": "#7dd3fc",
      "--status-bg": "#0f172a",
      "--status-text": "#7dd3fc",
      "--status-border": "#334155",
      "--placeholder-bg": "#0f172a",
      "--shadow-main": "0 12px 28px rgba(0,0,0,0.28)",
    };
  }

  return {
    "--page-bg": "linear-gradient(135deg, #d9edf2, #eef5f7)",
    "--login-bg": "linear-gradient(135deg, #d9edf2, #eef5f7)",
    "--text-main": "#17313A",
    "--text-soft": "#31545F",
    "--text-muted": "#5f7480",
    "--brand-text": "#17313A",
    "--brand-accent": "#0F7F99",
    "--card-bg": "#f8fbfc",
    "--card-bg-soft": "#ffffff",
    "--card-bg-alt": "#eef4f7",
    "--module-bg": "#eaf4f7",
    "--input-bg": "#ffffff",
    "--input-border": "#c9d8de",
    "--input-text": "#17313A",
    "--border-soft": "#d8e5ea",
    "--header-bg": "rgba(255,255,255,0.75)",
    "--header-box-bg": "rgba(255,255,255,0.92)",
    "--tab-bg": "#ffffff",
    "--tab-text": "#0F6F86",
    "--tab-border": "#bfd7dd",
    "--tab-active-bg": "#17A8C9",
    "--tab-active-text": "#ffffff",
    "--primary-btn": "#17A8C9",
    "--primary-btn-text": "#ffffff",
    "--outline-bg": "#ffffff",
    "--outline-text": "#0F7F99",
    "--outline-border": "#bcd2d9",
    "--danger-text": "#B53B3B",
    "--danger-border": "#E4B4B4",
    "--info-pill-bg": "#eff8fb",
    "--info-pill-text": "#0F6F86",
    "--status-bg": "#eff8fb",
    "--status-text": "#0F7F99",
    "--status-border": "#cdebf1",
    "--placeholder-bg": "#ffffff",
    "--shadow-main": "0 12px 28px rgba(0,0,0,0.08)",
  };
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [session, setSession] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState("home");
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [atendimentos, setAtendimentos] = useState([]);
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [attendanceSearch, setAttendanceSearch] = useState("");
useEffect(() => {
  async function carregarAtendimentos() {
    const { data, error } = await supabase
      .from("atendimentos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Erro ao carregar:", error);
      return;
    }

    setAtendimentos((data || []).map((item) => item.dados || item));
  }

  carregarAtendimentos();
}, []);
  const [viewingAttendanceId, setViewingAttendanceId] = useState(null);
  const [publicTrackingId, setPublicTrackingId] = useState("");

  const [cepStatus, setCepStatus] = useState({
    responsavel: { loading: false, error: "" },
    velorio: { loading: false, error: "" },
  });

  const [form, setForm] = useState(() => getInitialForm());
  const [services, setServices] = useState(initialServices);

  const [newHospital, setNewHospital] = useState("");
  const [newCemetery, setNewCemetery] = useState("");
  const [newCoffinColor, setNewCoffinColor] = useState("");
  const [newTechnician, setNewTechnician] = useState("");
  const [newAttendant, setNewAttendant] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newCar, setNewCar] = useState("");
  const [newSupport, setNewSupport] = useState("");
  const [expandedOperations, setExpandedOperations] = useState({});
  const [newUser, setNewUser] = useState({
    name: "",
    login: "",
    password: "",
    role: "OPERADOR",
  });

  const [theme, setTheme] = useState(() =>
    loadStorage("sf_theme_v1", "dark")
  );
const [pdfPreview, setPdfPreview] = useState({
  open: false,
  title: "",
  url: "",
  filename: "",
});
  const isDark = theme === "dark";
  const themeVars = getThemeVars(isDark);

  

  useEffect(() => {
    saveStorage("sf_theme_v1", theme);
  }, [theme]);

  useEffect(() => {
  saveStorage(STORAGE_KEYS.attendances, atendimentos);

  }, [atendimentos]);

  useEffect(() => {
    function syncTrackingRoute() {
      const trackingId = getTrackingIdFromPath();
      setPublicTrackingId(trackingId);
      if (trackingId) {
        setViewingAttendanceId(trackingId);
        setActiveTab("acompanhamento");
      }
    }

    syncTrackingRoute();
    window.addEventListener("popstate", syncTrackingRoute);

    return () => {
      window.removeEventListener("popstate", syncTrackingRoute);
    };
  }, []);

  const selectedCount = useMemo(
    () => services.filter((s) => s.checked).length,
    [services]
  );

  const totalValue = useMemo(() => {
    return services.reduce((acc, item) => {
      if (!item.checked) return acc;
      return acc + moneyToNumber(item.value);
    }, 0);
  }, [services]);


  const filteredAttendimentos = useMemo(() => {
    const term = attendanceSearch.trim().toLowerCase();
    if (!term) return atendimentos;

    return atendimentos.filter((item) =>
      [
        item.numero,
        item.falecido,
        item.responsavelNome,
        item.cemiterio,
        item.motorista,
        item.atendente,
        item.unidade,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [attendanceSearch, atendimentos]);

  const viewingAttendance = useMemo(() => {
    if (!viewingAttendanceId) return null;
    return atendimentos.find((item) => item.id === viewingAttendanceId) || null;
  }, [viewingAttendanceId, atendimentos]);

  function getTrackingIdFromPath() {
    if (typeof window === "undefined") return "";
    const match = window.location.pathname.match(/^\/acompanhamento\/([^/]+)/);
    return match?.[1] || "";
  }

  const isPublicAcompanhamento = !!publicTrackingId;

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleService(index) {
    setServices((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  }

  function updateService(index, field, value) {
    setServices((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function buscarCEP(cepFormatado, tipo) {
    const cepLimpo = cepFormatado.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      setCepStatus((prev) => ({
        ...prev,
        [tipo]: { loading: false, error: "" },
      }));
      return;
    }

    setCepStatus((prev) => ({
      ...prev,
      [tipo]: { loading: true, error: "" },
    }));

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepStatus((prev) => ({
          ...prev,
          [tipo]: { loading: false, error: "CEP não encontrado." },
        }));
        return;
      }

      if (tipo === "responsavel") {
        setForm((prev) => ({
          ...prev,
          responsavelEndereco: data.logradouro || "",
          responsavelBairro: data.bairro || "",
        }));
      }

      if (tipo === "velorio") {
        setForm((prev) => ({
          ...prev,
          velorioEndereco: data.logradouro || "",
          velorioBairro: data.bairro || "",
        }));
      }

      setCepStatus((prev) => ({
        ...prev,
        [tipo]: { loading: false, error: "" },
      }));
    } catch {
      setCepStatus((prev) => ({
        ...prev,
        [tipo]: { loading: false, error: "Erro ao consultar o CEP." },
      }));
    }
  }


  useEffect(() => {
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
              role: user.role || "OPERADOR",
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
            finalSettings[key] = Array.isArray(row?.items)
              ? row.items
              : DEFAULT_SETTINGS[key] || [];
          });
        } else {
          const seedSettings = SETTINGS_FIELDS.map((key) => ({
            key,
            items: Array.isArray(localSettings?.[key]) && localSettings[key].length
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

        setUsers(finalUsers);
        setSettings(finalSettings);
      } catch (error) {
        console.error("Erro ao carregar usuários/configurações:", error);
        setUsers(localUsers || DEFAULT_USERS);
        setSettings(localSettings || DEFAULT_SETTINGS);
        alert("Não foi possível sincronizar usuários e configurações com o banco. O sistema usará os dados locais deste navegador.");
      } finally {
        setBootLoading(false);
      }
    }

    bootstrapAppData();
  }, []);

  async function saveSettingListToSupabase(key, list) {
    const uniqueList = [...new Set((list || []).map((item) => String(item).trim()).filter(Boolean))];

    const { error } = await supabase
      .from("app_settings")
      .upsert([{ key, items: uniqueList }], { onConflict: "key" });

    if (error) {
      console.error(`Erro ao salvar configuração ${key}:`, error);
      alert("Erro ao salvar configuração no banco.");
      return false;
    }

    setSettings((prev) => ({
      ...prev,
      [key]: uniqueList,
    }));
    return true;
  }

  function handleCepChange(value, tipo) {
    const formatted = formatCep(value);

    if (tipo === "responsavel") {
      updateForm("responsavelCep", formatted);
    }

    if (tipo === "velorio") {
      updateForm("velorioCep", formatted);
    }

    const clean = formatted.replace(/\D/g, "");

    if (clean.length === 8) {
      buscarCEP(formatted, tipo);
    } else {
      setCepStatus((prev) => ({
        ...prev,
        [tipo]: { loading: false, error: "" },
      }));
    }
  }

  function handleLogin(e) {
    e.preventDefault();

    if (bootLoading) {
      setLoginError("Aguarde o carregamento dos usuários.");
      return;
    }

    const user = users.find(
      (u) => u.login === login && u.password === password
    );

    if (!user) {
      setLoginError("Usuário ou senha inválidos.");
      return;
    }

    setSession(user);
    setLoginError("");
  }

  function handleLogout() {
    setSession(null);
    setLogin("");
    setPassword("");
    setLoginError("");
    setFinalizado(false);
  }

  function resetAtendimento() {
    setForm(getInitialForm());
    setServices(initialServices);
    setShowServicesModal(false);
    setFinalizado(false);
    setEditingAttendanceId(null);
    setViewingAttendanceId(null);
    setActiveTab("home");
  }

  function getNextAttendanceNumber() {
    const year = new Date().getFullYear();
    const yearItems = atendimentos.filter((item) =>
      String(item.numero || "").startsWith(`ATD-${year}-`)
    );
    const next = yearItems.length + 1;
    return `ATD-${year}-${String(next).padStart(4, "0")}`;
  }

  function getPreparedFormData(sourceForm) {
    return {
      ...sourceForm,
      atendenteRemocao: sourceForm.atendenteGeral,
      atendenteEntrega: sourceForm.atendenteGeral,
      atendenteSepultamento: sourceForm.atendenteGeral,
      carroRemocao: sourceForm.carroGeral,
      carroEntrega: sourceForm.carroGeral,
      carroSepultamento: sourceForm.carroGeral,
      Remocao: sourceForm.motorista,
      Entrega: sourceForm.motorista,
      Sepultamento: sourceForm.motorista,
    };
  }

  async function persistAttendanceRecord(record) {
    const { error } = await supabase
      .from("atendimentos")
      .upsert(
        [
          {
            record_id: String(record.id),
            codigo: record.codigo,
            falecido: record.form?.falecido || record.falecido || "",
            responsavel: record.form?.responsavelNome || record.responsavelNome || "",
            data_atendimento: record.form?.dataAtendimento || record.dataAtendimento || null,
            status: record.status || "aberto",
            observacoes: record.form?.observacaoTermo || "",
            dados: record,
          },
        ],
        { onConflict: "record_id" }
      );

    if (error) {
      console.error("Erro ao salvar atualização operacional no Supabase:", error);
      alert("Erro ao salvar atualização do painel operacional no banco.");
      return false;
    }

    return true;
  }


  async function updateAttendanceRecord(attendanceId, updater) {
    const currentRecord = atendimentos.find((item) => item.id === attendanceId);

    if (!currentRecord) {
      return false;
    }

    const updatedRecord = updater(currentRecord);

    if (!updatedRecord) {
      return false;
    }

    const saved = await persistAttendanceRecord(updatedRecord);

    if (!saved) {
      return false;
    }

    setAtendimentos((prev) =>
      prev.map((item) => (item.id === attendanceId ? updatedRecord : item))
    );

    if (editingAttendanceId === attendanceId) {
      setForm(JSON.parse(JSON.stringify(updatedRecord.form || getInitialForm())));
      setServices(JSON.parse(JSON.stringify(updatedRecord.services || initialServices)));
    }

    if (viewingAttendanceId === attendanceId) {
      setViewingAttendanceId(String(updatedRecord.id));
    }

    return true;
  }

  function openAttendance(record, mode = "edit") {
    setForm(record.form);
    setServices(record.services);
    setEditingAttendanceId(record.id);
    setShowServicesModal(false);
    setFinalizado(mode === "preview");
    setActiveTab(mode === "preview" ? "atendimentos" : "atendimento");
  }

  function openAcompanhamento(record) {
    setViewingAttendanceId(record.id);
    setActiveTab("acompanhamento");
  }

  async function deleteAttendance(id) {
    const confirmed = window.confirm("Deseja excluir este atendimento salvo?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("atendimentos")
      .delete()
      .eq("record_id", String(id));

    if (error) {
      console.error("Erro ao excluir no Supabase:", error);
      alert("Erro ao excluir atendimento do banco");
      return;
    }

    setAtendimentos((prev) => prev.filter((item) => item.id !== id));

    if (editingAttendanceId === id) {
      resetAtendimento();
    }
  }

  async function finalizarAtendimento() {
    const preparedForm = getPreparedFormData(form);
    const now = new Date().toISOString();
    const recordId = editingAttendanceId || String(Date.now());
    const existingRecord = atendimentos.find((item) => item.id === recordId);

    const existingStages = JSON.parse(
      JSON.stringify(existingRecord?.operationalStages || createOperationStages())
    );

    existingStages.remocao = {
      ...existingStages.remocao,
      driver:
        existingStages.remocao?.driver || preparedForm.Remocao || preparedForm.motorista || "",
      car:
        existingStages.remocao?.car || preparedForm.carroRemocao || preparedForm.carroGeral || "",
    };
    existingStages.entrega = {
      ...existingStages.entrega,
      driver:
        existingStages.entrega?.driver || preparedForm.Entrega || preparedForm.motorista || "",
      car:
        existingStages.entrega?.car || preparedForm.carroEntrega || preparedForm.carroGeral || "",
    };
    existingStages.sepultamento = {
      ...existingStages.sepultamento,
      driver:
        existingStages.sepultamento?.driver || preparedForm.Sepultamento || preparedForm.motorista || "",
      car:
        existingStages.sepultamento?.car ||
        preparedForm.carroSepultamento ||
        preparedForm.carroGeral ||
        "",
    };

    existingStages.atendimento = {
      ...existingStages.atendimento,
      attendant:
        existingStages.atendimento?.attendant || preparedForm.atendenteGeral || "",
    };
    existingStages.procedimentoClinico = {
      ...existingStages.procedimentoClinico,
      technician:
        existingStages.procedimentoClinico?.technician || preparedForm.tecnico || "",
    };
    existingStages.ornamentacao = {
      ...existingStages.ornamentacao,
      support:
        existingStages.ornamentacao?.support || preparedForm.apoio || "",
    };

    const record = {
      id: recordId,
      codigo: existingRecord?.codigo || preparedForm.codigo || `ATD-${Date.now()}`,
      numero: existingRecord?.numero || getNextAttendanceNumber(),
      status: getAttendanceOperationalStatus(existingStages),
      createdAt: existingRecord?.createdAt || now,
      updatedAt: now,
      falecido: preparedForm.falecido,
      responsavelNome: preparedForm.responsavelNome,
      cemiterio: preparedForm.cemiterio,
      unidade: preparedForm.velorioUnidade,
      sala: preparedForm.velorioSala,
      localObito: preparedForm.localObito,
      motorista: preparedForm.motorista,
      atendente: preparedForm.atendenteGeral,
      dataAtendimento: preparedForm.dataAtendimento,
      horaAtendimento: preparedForm.horaAtendimento,
      totalValue,
      operationalStages: JSON.parse(JSON.stringify(existingStages)),
      form: JSON.parse(JSON.stringify(preparedForm)),
      services: JSON.parse(JSON.stringify(services)),
    };

    setForm((prev) => ({ ...preparedForm, codigo: record.codigo }));
    setEditingAttendanceId(recordId);

    const saved = await persistAttendanceRecord(record);

    if (!saved) {
      return;
    }
    setAtendimentos((prev) => {
      const exists = prev.some((item) => item.id === recordId);
      if (exists) {
        return prev.map((item) => (item.id === recordId ? record : item));
      }
      return [record, ...prev];
    });
    setFinalizado(true);
  }


  async function updateOperationalStage(attendanceId, stageKey, action) {
    const now = currentTime();

    await updateAttendanceRecord(attendanceId, (item) => {
      const nextStages = JSON.parse(
        JSON.stringify(item.operationalStages || createOperationStages())
      );
      const currentStage = nextStages[stageKey] || {
        status: "nao_iniciado",
        start: "",
        end: "",
        driver: "",
        car: "",
        attendant: "",
        technician: "",
        support: "",
      };

      if (action === "start") {
        nextStages[stageKey] = {
          ...currentStage,
          status: "em_andamento",
          start: currentStage.start || now,
          end: "",
        };
      }

      if (action === "finish") {
        nextStages[stageKey] = {
          ...currentStage,
          status: "finalizado",
          start: currentStage.start || now,
          end: now,
        };
      }

      return {
        ...item,
        operationalStages: nextStages,
        status: getAttendanceOperationalStatus(nextStages),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function updateOperationalTransport(attendanceId, stageKey, field, value) {
    await updateAttendanceRecord(attendanceId, (item) => {
      const nextStages = JSON.parse(
        JSON.stringify(item.operationalStages || createOperationStages())
      );
      const currentStage = nextStages[stageKey] || {
        status: "nao_iniciado",
        start: "",
        end: "",
        driver: "",
        car: "",
        attendant: "",
        technician: "",
        support: "",
      };

      nextStages[stageKey] = {
        ...currentStage,
        [field]: value,
      };

      const nextForm = JSON.parse(JSON.stringify(item.form || getInitialForm()));

      if (stageKey === "remocao") {
        if (field === "driver") nextForm.Remocao = value;
        if (field === "car") nextForm.carroRemocao = value;
      }

      if (stageKey === "entrega") {
        if (field === "driver") nextForm.Entrega = value;
        if (field === "car") nextForm.carroEntrega = value;
      }

      if (stageKey === "sepultamento") {
        if (field === "driver") nextForm.Sepultamento = value;
        if (field === "car") nextForm.carroSepultamento = value;
      }

      return {
        ...item,
        operationalStages: nextStages,
        updatedAt: new Date().toISOString(),
        form: nextForm,
      };
    });
  }

  async function updateOperationalPerson(attendanceId, stageKey, field, value) {
    await updateAttendanceRecord(attendanceId, (item) => {
      const nextStages = JSON.parse(
        JSON.stringify(item.operationalStages || createOperationStages())
      );
      const currentStage = nextStages[stageKey] || {
        status: "nao_iniciado",
        start: "",
        end: "",
        driver: "",
        car: "",
        attendant: "",
        technician: "",
        support: "",
      };

      nextStages[stageKey] = {
        ...currentStage,
        [field]: value,
      };

      const nextForm = JSON.parse(JSON.stringify(item.form || getInitialForm()));

      if (stageKey === "atendimento" && field === "attendant") {
        nextForm.atendenteGeral = value;
      }

      if (stageKey === "procedimentoClinico" && field === "technician") {
        nextForm.tecnico = value;
      }

      if (stageKey === "ornamentacao" && field === "support") {
        nextForm.apoio = value;
      }

      return {
        ...item,
        operationalStages: nextStages,
        updatedAt: new Date().toISOString(),
        form: nextForm,
        atendente: stageKey === "atendimento" && field === "attendant" ? value : item.atendente,
      };
    });
  }

  function toggleOperationalCard(attendanceId) {
    setExpandedOperations((prev) => ({
      ...prev,
      [attendanceId]: !prev[attendanceId],
    }));
  }

  async function addHospital() {
    const value = newHospital.trim();
    if (!value) return;
    if (settings.hospitals.includes(value)) return;

    const nextList = [...(settings.hospitals || []), value];
    const saved = await saveSettingListToSupabase("hospitals", nextList);
    if (saved) {
      setNewHospital("");
    }
  }

  async function removeHospital(value) {
    const nextList = (settings.hospitals || []).filter((item) => item !== value);
    await saveSettingListToSupabase("hospitals", nextList);
  }

  async function addCemetery() {
    const value = newCemetery.trim();
    if (!value) return;
    if (settings.cemeteries.includes(value)) return;

    const nextList = [...(settings.cemeteries || []), value];
    const saved = await saveSettingListToSupabase("cemeteries", nextList);
    if (saved) {
      setNewCemetery("");
    }
  }

  async function removeCemetery(value) {
    const nextList = (settings.cemeteries || []).filter((item) => item !== value);
    await saveSettingListToSupabase("cemeteries", nextList);
  }

  async function addSettingItem(key, value, setter) {
    const clean = value.trim();
    if (!clean) return;
    if ((settings[key] || []).includes(clean)) return;

    const nextList = [...(settings[key] || []), clean];
    const saved = await saveSettingListToSupabase(key, nextList);
    if (saved) {
      setter("");
    }
  }

  async function removeSettingItem(key, value) {
    const nextList = (settings[key] || []).filter((item) => item !== value);
    await saveSettingListToSupabase(key, nextList);
  }

  async function addUser() {
    if (!newUser.name || !newUser.login || !newUser.password) {
      alert("Preencha nome, login e senha.");
      return;
    }

    if (users.some((u) => u.login === newUser.login)) {
      alert("Esse login já existe.");
      return;
    }

    const userToSave = { ...newUser, id: String(Date.now()) };

    const { error } = await supabase.from("app_users").insert([userToSave]);

    if (error) {
      console.error("Erro ao salvar usuário:", error);
      alert("Erro ao salvar usuário no banco.");
      return;
    }

    setUsers((prev) => [...prev, userToSave]);

    setNewUser({
      name: "",
      login: "",
      password: "",
      role: "OPERADOR",
    });
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

  function drawCell(doc, x, y, w, h, text = "", opts = {}) {
    doc.rect(x, y, w, h);
    const fontSize = opts.fontSize || 8;
    doc.setFont("times", opts.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);

    const tx =
      opts.align === "center" ? x + w / 2 : x + (opts.paddingLeft ?? 1.3);
    const ty = y + h / 2 + (opts.offsetY ?? 1.25);

    if (text) {
      doc.text(String(text), tx, ty, {
        maxWidth: w - 2,
        align: opts.align === "center" ? "center" : "left",
      });
    }
  }

  function gerarFichaPDF() {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.22);

    const left = 5;
    let y = 5;

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("FUNERÁRIA SANTA RITA", 105, y + 5, { align: "center" });

    doc.setFontSize(11);
    doc.text("RENATO R. BATISTA – EPP", 105, y + 9.7, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("CNPJ: 00.579.750/0001-60 – Insc. 04.102.221-1", 105, y + 14, {
      align: "center",
    });
    doc.text(
      "Fones: (092) 3308-3404 / 98139-6563  CEP: 69.095-010",
      105,
      y + 18.2,
      {
        align: "center",
      }
    );
    doc.text(
      "Rua Professor Félix, N°15 – Cidade Nova I / Manaus – AM",
      105,
      y + 22.4,
      {
        align: "center",
      }
    );

    y += 26;

    drawCell(doc, left, y, 200, 5.9, `FALECIDO: ${form.falecido}`, {
      bold: true,
      fontSize: 8.6,
    });
    y += 5.9;

    drawCell(doc, left, y, 150, 5.9, `LOCAL DO ÓBITO: ${form.localObito}`, {
      bold: true,
      fontSize: 8.2,
    });
    drawCell(
      doc,
      155,
      y,
      50,
      5.9,
      `DATA/SAÍDA: ${formatDateBR(form.dataSaida)}`,
      {
        bold: true,
        fontSize: 8.2,
      }
    );
    y += 5.9;

    drawCell(doc, left, y, 150, 5.9, `CEMITÉRIO: ${form.cemiterio}`, {
      bold: true,
      fontSize: 8.2,
    });
    drawCell(doc, 155, y, 50, 5.9, `HORA/SAÍDA: ${form.horaSaida}`, {
      bold: true,
      fontSize: 8.2,
    });
    y += 5.9;

    drawCell(doc, left, y, 200, 5.9, `HORA/ATEND: ${form.horaAtendimento}`, {
      bold: true,
      fontSize: 8.2,
    });
    y += 5.9;

    drawCell(
      doc,
      left,
      y,
      60,
      5.9,
      `DATA/ATEND: ${formatDateBR(form.dataAtendimento)}`,
      {
        bold: true,
        fontSize: 8,
      }
    );
    drawCell(
      doc,
      65,
      y,
      95,
      5.9,
      `CHEGOU NA CLÍNICA ÀS: ${form.chegouClinica}`,
      {
        bold: true,
        fontSize: 7.8,
      }
    );
    drawCell(doc, 160, y, 45, 5.9, `INÍCIO ÀS: ${form.inicioAs}`, {
      bold: true,
      fontSize: 8,
    });
    y += 5.9;

    if (form.tipoPlano === "socio") {
      drawCell(doc, left, y, 55, 5.9, `PLANO: ${form.plano}`, {
        fontSize: 8,
      });
      drawCell(doc, 60, y, 45, 5.9, `CÓDIGO: ${form.codigo}`, {
        fontSize: 8,
      });
      drawCell(doc, 105, y, 100, 5.9, `DEPENDENTE: ${form.dependente}`, {
        fontSize: 8,
      });
    } else {
      drawCell(doc, left, y, 200, 5.9, `PLANO: SERVIÇO PARTICULAR`, {
        fontSize: 8,
      });
    }
    y += 6.6;

    drawCell(doc, left, y, 200, 5.9, "SERVIÇOS PRESTADOS", {
      bold: true,
      fontSize: 8.8,
      align: "center",
    });
    y += 5.9;

    drawCell(doc, left, y, 8, 5.1, "", {});
    drawCell(doc, 13, y, 152, 5.1, "", {});
    drawCell(doc, 165, y, 20, 5.1, "QUANT.", {
      fontSize: 7.6,
      align: "center",
    });
    drawCell(doc, 185, y, 20, 5.1, "VALOR:", {
      fontSize: 7.6,
      align: "center",
    });
    y += 5.1;

    services.forEach((item) => {
      let label = item.name;

      if (item.name === "COROA DE FLORES" && item.note) {
        label += `     FRASE: ${item.note}`;
      }

      if (item.name === "OUTRAS DESPESAS" && item.note) {
        label += ` ${item.note}`;
      }

      drawCell(doc, left, y, 8, 4.8, item.checked ? "X" : "", {
        fontSize: 8,
        bold: true,
        align: "center",
        offsetY: 1.1,
      });

      drawCell(doc, 13, y, 152, 4.8, label, {
        fontSize: item.name === "COROA DE FLORES" ? 6.8 : 7.6,
        paddingLeft: 1.5,
      });

      drawCell(doc, 165, y, 20, 4.8, item.qty || "", {
        fontSize: 7.3,
        align: "center",
      });

      drawCell(
        doc,
        185,
        y,
        20,
        4.8,
        item.value ? formatMoney(item.value) : "",
        {
          fontSize: 7.3,
          align: "center",
        }
      );

      y += 4.8;
    });

    drawCell(doc, left, y, 180, 5.6, "VALOR TOTAL:", {
      bold: true,
      fontSize: 7.8,
    });
    drawCell(doc, 185, y, 20, 5.6, formatMoney(totalValue), {
      bold: true,
      fontSize: 7.5,
      align: "center",
    });
    y += 6.8;

    drawCell(doc, left, y, 200, 5.9, "DADOS DO RESPONSÁVEL", {
      bold: true,
      fontSize: 8.8,
      align: "center",
    });
    y += 5.9;

    drawCell(doc, left, y, 145, 5.9, `NOME: ${form.responsavelNome}`, {
      fontSize: 7.7,
    });
    drawCell(doc, 150, y, 55, 5.9, `CPF: ${form.responsavelCpf}`, {
      fontSize: 7.7,
    });
    y += 5.9;

    drawCell(doc, left, y, 200, 5.9, `RG: ${form.responsavelRg}`, {
      fontSize: 7.7,
    });
    y += 5.9;

    drawCell(doc, left, y, 160, 5.9, `ENDEREÇO: ${form.responsavelEndereco}`, {
      fontSize: 7.4,
    });
    drawCell(doc, 165, y, 40, 5.9, `CEP: ${form.responsavelCep}`, {
      fontSize: 7.4,
    });
    y += 5.9;

    drawCell(doc, left, y, 75, 5.9, `BAIRRO: ${form.responsavelBairro}`, {
      fontSize: 7.4,
    });
    drawCell(doc, 80, y, 60, 5.9, `CELULAR: ${form.responsavelCelular1}`, {
      fontSize: 7.4,
    });
    drawCell(doc, 140, y, 65, 5.9, `CELULAR: ${form.responsavelCelular2}`, {
      fontSize: 7.4,
    });
    y += 5.9;

    const velorioTexto =
      form.velorioTipo === "funeraria"
        ? [form.velorioUnidade, form.velorioSala].filter(Boolean).join(" - ")
        : [
            form.velorioNomeLocal,
            form.velorioEndereco,
            form.velorioNumero,
            form.velorioBairro,
          ]
            .filter(Boolean)
            .join(", ");

    drawCell(doc, left, y, 200, 6, `LOCAL DO VELÓRIO: ${velorioTexto}`, {
      fontSize: 7.4,
    });
    y += 6.8;

    function drawFinalBlock(titulo, atendente, assinatura, carro) {
      drawCell(doc, left, y, 70, 5.5, `ATENDENTE: ${atendente || ""}`, {
        bold: true,
        fontSize: 7.2,
      });
      drawCell(doc, 75, y, 80, 5.5, `${titulo} ${assinatura || ""}`, {
        bold: true,
        fontSize: 7.2,
      });
      drawCell(doc, 155, y, 50, 5.5, `CARRO: ${carro || ""}`, {
        bold: true,
        fontSize: 7.2,
      });
      y += 5.5;

      drawCell(doc, left, y, 70, 5.5, "", {});
      drawCell(doc, 75, y, 80, 5.5, "ASSINATURA:", {
        bold: true,
        fontSize: 7.2,
      });
      drawCell(doc, 155, y, 50, 5.5, "", {});
      y += 5.5;
    }

    drawFinalBlock(
      "REMOÇÃO:",
      form.atendenteRemocao,
      form.assinaturaRemocao,
      form.carroRemocao
    );

    drawFinalBlock(
      "ENTREGA:",
      form.atendenteEntrega,
      form.assinaturaEntrega,
      form.carroEntrega
    );

    drawFinalBlock(
      "SEPULTAMENTO:",
      form.atendenteSepultamento,
      form.assinaturaSepultamento,
      form.carroSepultamento
    );

    const assinaturaY = Math.min(y + 16, 287);
    doc.setFont("times", "bold");
    doc.setFontSize(8.2);
    doc.text("Responsável:", 45, assinaturaY + 0.5);
    doc.line(70, assinaturaY, 145, assinaturaY);

    const filename = `ficha-${(form.falecido || "atendimento")
  .replace(/\s+/g, "-")
  .toLowerCase()}.pdf`;

openPdfPreview(doc, filename, "Pré-visualização da Ficha");
  }

  function gerarTermoPDF() {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);

    let y = 15;
    const left = 15;

    function xMark(cond) {
      return cond ? "X" : "";
    }

    function drawSimpleLine(x1, yy, x2) {
      doc.line(x1, yy, x2, yy);
    }

    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, "0");
    const ano = dataAtual.getFullYear();
    const meses = [
      "JANEIRO",
      "FEVEREIRO",
      "MARÇO",
      "ABRIL",
      "MAIO",
      "JUNHO",
      "JULHO",
      "AGOSTO",
      "SETEMBRO",
      "OUTUBRO",
      "NOVEMBRO",
      "DEZEMBRO",
    ];
    const mes = meses[dataAtual.getMonth()];

    const localVelorio =
      form.velorioTipo === "funeraria"
        ? "funerária"
        : form.velorioTipo === "residencia"
          ? "residência"
          : form.velorioTipo === "igreja"
            ? "igreja"
            : form.velorioTipo || "";

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("TERMO DE AUTORIZAÇÃO PREPARO DO CORPO", 105, y, {
      align: "center",
    });

    y += 10;

    doc.setFont("times", "normal");
    doc.setFontSize(10);

    doc.text("PELO PRESENTE EU,", left, y);
    doc.text((form.responsavelNome || "").toUpperCase(), 58, y);
    drawSimpleLine(58, y + 0.5, 118, y);
    doc.text("RG:", 120, y);
    doc.text(form.responsavelRg || "", 128, y);
    drawSimpleLine(128, y + 0.5, 152, y);
    doc.text("CPF:", 154, y);
    doc.text(form.responsavelCpf || "", 163, y);
    drawSimpleLine(163, y + 0.5, 198, y);

    y += 7;

    doc.text("REPRESENTANTE LEGAL DO FALECIDO:", left, y);
    doc.text((form.falecido || "").toUpperCase(), 85, y);
    drawSimpleLine(85, y + 0.5, 145, y);

    doc.text("LOCAL DO ÓBITO:", 147, y);
    doc.text((form.localObito || "").toUpperCase(), 177, y);

    y += 7;

    drawSimpleLine(15, y + 0.5, 98, y);
    drawSimpleLine(177, y + 0.5, 198, y);

    doc.text("FALECIMENTO:", left, y);
    doc.text(formatDateBR(form.dataSaida), 42, y);
    drawSimpleLine(42, y + 0.5, 67, y);

    doc.text("HORA", 69, y);
    doc.text(form.horaSaida || "", 79, y);
    drawSimpleLine(79, y + 0.5, 95, y);

    doc.text("SENDO O GRAU DE PARENTESCO COM O", 98, y);

    y += 7;

    doc.text("FALECIDO:", left, y);
    doc.text((form.parentesco || "").toUpperCase(), 30, y);
    drawSimpleLine(30, y + 0.5, 75, y);

    y += 10;

    doc.text(
      "Solicito e autorizo, após obter as informações sobre o procedimento, da realização de Tanatopraxia para conservar",
      left,
      y
    );
    y += 6;
    doc.text(
      "e manter a aparência normal do corpo. Autorizo também o registro de imagens do procedimento realizado em",
      left,
      y
    );
    y += 6;
    doc.text(
      "caráter sigiloso, com o único propósito de esclarecer quaisquer dúvidas que possam surgir quanto ao procedimento realizado.",
      left,
      y
    );

    y += 12;

    doc.setFont("times", "bold");
    doc.text("DO CORPO", 20, y);
    y += 8;

    doc.setFont("times", "normal");
    doc.text("•", 18, y);
    doc.text("Condições:", 22, y);
    doc.text(`( ${xMark(form.necropsia === "sim")} ) Necropsiado`, 82, y);
    doc.text(`( ${xMark(form.necropsia === "nao")} ) Não Necropsiado.`, 118, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text("Chegou vestido:", 22, y);
    doc.text(`( ${xMark(form.veioVestido === "sim")} ) Sim`, 82, y);
    doc.text(`( ${xMark(form.veioVestido === "nao")} ) Não`, 102, y);
    doc.text(`( ${xMark(form.roupaDestino === "devolver")} ) Devolver`, 120, y);
    doc.text(`( ${xMark(form.roupaDestino === "descartar")} ) Descartar`, 155, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text("Retirar o esmalte da unha:", 22, y);
    doc.text(`( ${xMark(form.retirarEsmalte === "sim")} ) Sim`, 98, y);
    doc.text(`( ${xMark(form.retirarEsmalte === "nao")} ) Não`, 126, y);

    y += 12;

    doc.setFont("times", "bold");
    doc.text("DA ESTÉTICA", 20, y);
    y += 8;

    doc.setFont("times", "normal");
    doc.text("•", 18, y);
    doc.text("Barbear:", 22, y);
    doc.text(`( ${xMark(form.barbear === "sim")} ) Sim`, 50, y);
    doc.text(`( ${xMark(form.barbear === "nao")} ) Não`, 69, y);

    doc.text("| Bigode:", 90, y);
    doc.text(`( ${xMark(form.bigode === "sim")} ) Sim`, 116, y);
    doc.text(`( ${xMark(form.bigode === "nao")} ) Não`, 135, y);

    doc.text("| Cavanhaque:", 154, y);
    doc.text(`( ${xMark(form.cavanhaque === "sim")} ) Sim`, 183, y);

    y += 8;
    doc.text(`( ${xMark(form.cavanhaque === "nao")} ) Não`, 183, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text("Maquiagem:", 22, y);
    doc.text(`( ${xMark(form.maquiagem === "sim")} ) Sim`, 52, y);
    doc.text(`( ${xMark(form.maquiagem === "nao")} ) Não`, 71, y);
    doc.text("->", 91, y);
    doc.text(`( ${xMark(form.maquiagemTipo === "leve")} ) leve`, 98, y);
    doc.text(`( ${xMark(form.maquiagemTipo === "natural")} ) natural`, 124, y);
    doc.text(`( ${xMark(form.maquiagemTipo === "forte")} ) forte`, 155, y);

    y += 12;

    doc.setFont("times", "bold");
    doc.text("ORNATO E ADORNO", 20, y);
    y += 8;

    doc.setFont("times", "normal");
    doc.text("•", 18, y);
    doc.text("Ornamentação com flores", 22, y);
    doc.text(`( ${xMark(form.ornamentacao === "sim")} ) Sim`, 78, y);
    doc.text(`( ${xMark(form.ornamentacao === "nao")} ) Não`, 97, y);
    doc.text(`| ( ${xMark(form.tipoFlor === "naturais")} ) Naturais`, 116, y);
    doc.text(`( ${xMark(form.tipoFlor === "artificiais")} ) Artificiais`, 154, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text(
      `A roupa foi entregue para: ${(form.roupaEntreguePara || "").toUpperCase()}`,
      22,
      y
    );

    y += 10;

    doc.setFont("times", "bold");
    doc.text("OBSERVAÇÃO", 20, y);
    y += 6;
    doc.setFont("times", "normal");
    doc.text((form.observacaoTermo || "").toUpperCase(), 22, y);
    drawSimpleLine(22, y + 2, 190);

    y += 14;

    doc.setFont("times", "bold");
    doc.text("GERAL", 20, y);
    y += 8;
    doc.setFont("times", "normal");

    doc.text("•", 18, y);
    doc.text(
      `Tempo previsto de velório: ${form.tempoVelorioValor || ""} - ${(form.tempoVelorioUnidade || "").toUpperCase()}`,
      22,
      y
    );

    y += 8;

    doc.text("•", 18, y);
    doc.text(`Local do velório: ${localVelorio},`, 22, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text(`Sala: ${(form.velorioSala || "").toUpperCase()}`, 22, y);
    doc.text(`Horário: ${form.horarioVelorio || ""}`, 75, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text(`Religião: ${(form.religiao || "").toUpperCase()}`, 22, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text(`Técnico: ${(form.tecnico || "").toUpperCase()}`, 22, y);

    y += 8;

    doc.text("•", 18, y);
    doc.text(`Atendente: ${(form.atendenteEntrega || "").toUpperCase()}`, 22, y);

    y += 8;

    let modeloUrnaTexto = form.modeloUrna || "";
    if (form.modeloUrna === "luxo" && form.refUrna) {
      modeloUrnaTexto = `LUXO REF: ${form.refUrna}`;
    } else {
      modeloUrnaTexto = (form.modeloUrna || "").toUpperCase();
    }

    doc.text("•", 18, y);
    doc.text(
      `Modelo de urna: ${modeloUrnaTexto} Cor: ${(form.corUrna || "").toUpperCase()}`,
      22,
      y
    );

    y += 18;

    doc.text(`Manaus, ${dia} de ${mes} de ${ano}`, 115, y);

    y += 22;

    doc.line(60, y, 140, y);
    y += 6;
    doc.setFont("times", "bold");
    doc.text("autorização", 95, y);

    const filename = `termo-${(form.falecido || "atendimento")
  .replace(/\s+/g, "-")
  .toLowerCase()}.pdf`;

openPdfPreview(doc, filename, "Pré-visualização do Termo");
  }
function openPdfPreview(doc, filename, title) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  setPdfPreview((prev) => {
    if (prev.url) {
      URL.revokeObjectURL(prev.url);
    }

    return {
      open: true,
      title,
      url,
      filename,
    };
  });
}
function closePdfPreview() {
  setPdfPreview((prev) => {
    if (prev.url) {
      URL.revokeObjectURL(prev.url);
    }

    return {
      open: false,
      title: "",
      url: "",
      filename: "",
    };
  });
}
function downloadPreviewPdf() {
  if (!pdfPreview.url) return;

  const a = document.createElement("a");
  a.href = pdfPreview.url;
  a.download = pdfPreview.filename || "documento.pdf";
  a.click();
}
function printPreviewPdf() {
  if (!pdfPreview.url) return;

  const printWindow = window.open(pdfPreview.url, "_blank");
  if (!printWindow) {
    alert("Não foi possível abrir a janela de impressão.");
    return;
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
  if (finalizado) {
    return (
      <div style={{ ...styles.page, ...themeVars }}>
        <div style={{ marginBottom: 20 }}>
          <button
            style={styles.outlineDarkBtn}
            onClick={() => {
              resetAtendimento();
            }}
          >
            🏠 Início
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Atendimento Finalizado</h2>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              style={styles.outlineDarkBtn}
              onClick={() => setFinalizado(false)}
            >
              ✏️ Editar
            </button>

            <button
              style={styles.outlineDarkBtn}
              onClick={() => {
                setFinalizado(false);
                setActiveTab("atendimentos");
              }}
            >
              📋 Atendimentos
            </button>

            <button style={styles.primaryBtn} onClick={gerarFichaPDF}>
              🧾 Gerar Ficha PDF
            </button>

            <button style={styles.primaryBtn} onClick={gerarTermoPDF}>
              📄 Gerar Termo PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (bootLoading) {
    return (
      <div style={{ ...styles.loginPage, ...themeVars }}>
        <div style={styles.loginCard}>
          <div style={styles.loginBrandWrap}>
            <img
              src="/logo.png"
              alt="Logo Grupo São Francisco"
              style={styles.loginLogo}
            />
            <h1 style={styles.loginTitle}>Sistema Funerário</h1>
            <p style={styles.loginSub}>Carregando usuários e configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session && isPublicAcompanhamento) {
    return (
      <div style={{ ...styles.page, ...themeVars }}>
        <section style={{ ...styles.moduleCard, maxWidth: 980, margin: "32px auto" }}>
          <div style={styles.moduleHeader}>
            <div>
              <h2 style={styles.moduleTitle}>Acompanhamento da Família</h2>
              <p style={styles.moduleSub}>
                Atualizações do atendimento do seu ente querido.
              </p>
            </div>
          </div>

          {!viewingAttendance ? (
            <div style={styles.modulePlaceholder}>
              <div style={styles.modulePlaceholderTitle}>Atendimento não encontrado</div>
              <div style={styles.modulePlaceholderText}>
                Verifique se o link está correto ou peça um novo link à funerária.
              </div>
            </div>
          ) : (
            <div style={styles.acompanhamentoWrap}>
              <div style={styles.acompanhamentoHero}>
                <div>
                  <div style={styles.recordNumber}>{viewingAttendance.numero}</div>
                  <div style={styles.recordName}>
                    {viewingAttendance.falecido || "Sem nome informado"}
                  </div>
                  <div style={styles.recordMeta}>
                    {viewingAttendance.unidade || "Unidade não informada"}
                    {viewingAttendance.sala ? ` • ${viewingAttendance.sala}` : ""}
                    {viewingAttendance.cemiterio ? ` • ${viewingAttendance.cemiterio}` : ""}
                  </div>
                </div>
                <div style={styles.statusBadge}>{viewingAttendance.status}</div>
              </div>

              <div style={styles.acompanhamentoInfoGrid}>
                <div><strong>Responsável:</strong> {viewingAttendance.responsavelNome || "—"}</div>
                <div><strong>Local do óbito:</strong> {viewingAttendance.localObito || "—"}</div>
                <div><strong>Atendente geral:</strong> {viewingAttendance.atendente || "—"}</div>
                <div><strong>Motorista geral:</strong> {viewingAttendance.motorista || "—"}</div>
              </div>

              <div style={styles.acompanhamentoStages}>
                {OPERATION_STAGES.map((stage) => {
                  const stageState =
                    viewingAttendance.operationalStages?.[stage.key] || {
                      status: "nao_iniciado",
                      start: "",
                      end: "",
                      driver: "",
                      car: "",
                      attendant: "",
                      technician: "",
                      support: "",
                    };

                  const statusLabel = getOperationStatusLabel(stageState.status);
                  const statusStyle =
                    stageState.status === "finalizado"
                      ? styles.operationStatusDone
                      : stageState.status === "em_andamento"
                        ? styles.operationStatusRunning
                        : styles.operationStatusWaiting;

                  return (
                    <div key={stage.key} style={styles.acompanhamentoStageCard}>
                      <div style={styles.operationMain}>
                        <div style={styles.operationName}>{stage.label}</div>
                        <div style={{ ...styles.operationStatusBase, ...statusStyle }}>
                          {statusLabel}
                        </div>
                      </div>

                      <div style={styles.acompanhamentoTimes}>
                        <div><strong>Início:</strong> {stageState.start || "—"}</div>
                        <div><strong>Fim:</strong> {stageState.end || "—"}</div>
                      </div>

                      {stage.key === "atendimento" && (
                        <div style={styles.acompanhamentoExtra}>
                          <strong>Atendente:</strong> {stageState.attendant || "—"}
                        </div>
                      )}

                      {stage.key === "procedimentoClinico" && (
                        <div style={styles.acompanhamentoExtra}>
                          <strong>Técnico:</strong> {stageState.technician || "—"}
                        </div>
                      )}

                      {stage.key === "ornamentacao" && (
                        <div style={styles.acompanhamentoExtra}>
                          <strong>Apoio:</strong> {stageState.support || "—"}
                        </div>
                      )}

                      {isTransportStage(stage.key) && (
                        <div style={styles.acompanhamentoExtraGrid}>
                          <div><strong>Motorista:</strong> {stageState.driver || "—"}</div>
                          <div><strong>Carro:</strong> {stageState.car || "—"}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ ...styles.loginPage, ...themeVars }}>
        <div style={styles.loginCard}>
          <div style={styles.loginBrandWrap}>
            <img
              src="/logo.png"
              alt="Logo Grupo São Francisco"
              style={styles.loginLogo}
            />
            <h1 style={styles.loginTitle}>Sistema Funerário</h1>
            <p style={styles.loginSub}>Acesso interno</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={styles.field}>
              <label style={styles.label}>Usuário</label>
              <input
                style={styles.input}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Senha</label>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {loginError ? <div style={styles.errorBox}>{loginError}</div> : null}

            <button style={styles.primaryBtn} type="submit">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, ...themeVars }}>
      <header style={styles.header}>
        <div style={styles.headerBrand}>
          <img
            src="/logo.png"
            alt="Logo Grupo São Francisco"
            style={styles.headerLogo}
          />
          <div>
            <div style={styles.brandTop}>GRUPO SÃO FRANCISCO</div>
            <div style={styles.brandSub}>Assistência e cuidado em todos os momentos</div>
          </div>
        </div>

        <div style={styles.userBox}>
          <div>
            <div style={{ fontWeight: 700 }}>{session.name}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{session.role}</div>
          </div>
          <button
            style={styles.outlineBtn}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? "☀️ Claro" : "🌙 Escuro"}
          </button>
          <button style={styles.outlineBtn} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {activeTab !== "home" && (
        <div style={styles.tabs}>
          <button
            style={activeTab === "home" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("home")}
          >
            Início
          </button>

          <button
            style={activeTab === "atendimento" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("atendimento")}
          >
            Novo Atendimento
          </button>

          <button
            style={activeTab === "atendimentos" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("atendimentos")}
          >
            Atendimentos
          </button>

          <button
            style={activeTab === "operacional" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("operacional")}
          >
            Painel Operacional
          </button>

          <button
            style={activeTab === "acompanhamento" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("acompanhamento")}
          >
            Acompanhamento
          </button>

          {session.role === "ADM" && (
            <button
              style={activeTab === "config" ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab("config")}
            >
              Configurações
            </button>
          )}
        </div>
      )}

      {activeTab === "home" && (
        <>
          <section style={styles.homeHero}>
            <div style={styles.homeGrid}>
              <button
                style={styles.homeCard}
                onClick={() => {
                  resetAtendimento();
                  setFinalizado(false);
                  setActiveTab("atendimento");
                }}
              >
                <div style={styles.homeCardTitle}>Novo Atendimento</div>
                <div style={styles.homeCardText}>Iniciar novo registro</div>
              </button>

              <button
                style={styles.homeCard}
                onClick={() => setActiveTab("atendimentos")}
              >
                <div style={styles.homeCardTitle}>Atendimentos</div>
                <div style={styles.homeCardText}>Consultar, editar e reabrir registros</div>
              </button>

              <button
                style={styles.homeCard}
                onClick={() => setActiveTab("operacional")}
              >
                <div style={styles.homeCardTitle}>Painel Operacional</div>
                <div style={styles.homeCardText}>Acompanhar serviços em andamento</div>
              </button>

              <button
                style={styles.homeCard}
                onClick={() =>
                  session.role === "ADM"
                    ? setActiveTab("config")
                    : alert("Somente administradores acessam as configurações.")
                }
              >
                <div style={styles.homeCardTitle}>Configurações</div>
                <div style={styles.homeCardText}>Gerenciar cadastros do sistema</div>
              </button>
            </div>
          </section>

        </>
      )}

      {activeTab === "atendimentos" && (
        <section style={styles.moduleCard}>
          <div style={styles.moduleHeader}>
            <div>
              <h2 style={styles.moduleTitle}>Atendimentos</h2>
              <p style={styles.moduleSub}>
                Consulte os atendimentos salvos, abra novamente para PDF e edite quando precisar.
              </p>
            </div>
            <button
              style={styles.primaryBtn}
              onClick={() => {
                resetAtendimento();
                setFinalizado(false);
                setActiveTab("atendimento");
              }}
            >
              Novo Atendimento
            </button>
          </div>

          <div style={styles.searchRow}>
            <div style={{ ...styles.field, marginBottom: 0, flex: 1 }}>
              <label style={styles.label}>Buscar atendimento</label>
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
              <div style={styles.modulePlaceholderTitle}>Nenhum atendimento salvo</div>
              <div style={styles.modulePlaceholderText}>
                Finalize um atendimento para ele aparecer aqui e ficar disponível para edição e geração de PDF.
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
                  </div>

                  <div style={styles.recordActions}>
                    <button
                      style={styles.outlineDarkBtn}
                      onClick={() => openAttendance(item, "preview")}
                    >
                      Ver / PDF
                    </button>
                    <button
                      style={styles.outlineDarkBtn}
                      onClick={() => openAcompanhamento(item)}
                    >
                      Acompanhar
                    </button>
                    <button
                      style={styles.outlineDarkBtn}
                      onClick={() => {
                        const link = `${window.location.origin}/acompanhamento/${item.id}`;
                        navigator.clipboard.writeText(link);
                        alert("Link da família copiado!");
                      }}
                    >
                      📲 Copiar link da família
                    </button>
                    <button
                      style={styles.primaryBtn}
                      onClick={() => openAttendance(item, "edit")}
                    >
                      Editar
                    </button>
                    <button
                      style={styles.outlineDangerBtn}
                      onClick={() => deleteAttendance(item.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      
{activeTab === "operacional" && (
        <section style={styles.moduleCard}>
          <div style={styles.moduleHeader}>
            <div>
              <h2 style={styles.moduleTitle}>Painel Operacional</h2>
              <p style={styles.moduleSub}>
                Controle o início e o fim de cada etapa do atendimento.
              </p>
            </div>
          </div>

          {atendimentos.length === 0 ? (
            <div style={styles.modulePlaceholder}>
              <div style={styles.modulePlaceholderTitle}>Nenhum atendimento disponível</div>
              <div style={styles.modulePlaceholderText}>
                Finalize um atendimento para ele aparecer no painel operacional.
              </div>
            </div>
          ) : (
            <div style={styles.recordsList}>
              {atendimentos.map((item) => {
                const expanded = !!expandedOperations[item.id];

                return (
                  <div key={item.id} style={styles.operationalCard}>
                    <div style={styles.operationalHeader}>
                      <div style={styles.recordTop}>
                        <div>
                          <div style={styles.recordNumber}>{item.numero}</div>
                          <div style={styles.recordName}>{item.falecido || "Sem nome informado"}</div>
                          <div style={styles.recordMeta}>
                            {item.unidade ? `${item.unidade}` : "Unidade não informada"}
                            {item.sala ? ` • ${item.sala}` : ""}
                            {item.motorista ? ` • Motorista geral: ${item.motorista}` : ""}
                          </div>
                        </div>
                        <div style={styles.statusBadge}>{item.status}</div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          style={styles.outlineDarkBtn}
                          onClick={() => openAcompanhamento(item)}
                        >
                          Acompanhar
                        </button>
                        <button
                          style={styles.outlineDarkBtn}
                          onClick={() => toggleOperationalCard(item.id)}
                        >
                          {expanded ? "Fechar" : "Abrir"}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div style={styles.operationGrid}>
                        {OPERATION_STAGES.map((stage) => {
                          const stageState =
                            item.operationalStages?.[stage.key] || {
                              status: "nao_iniciado",
                              start: "",
                              end: "",
                              driver: "",
                              car: "",
                              attendant: "",
                              technician: "",
                              support: "",
                            };
                          const statusLabel = getOperationStatusLabel(stageState.status);
                          const statusStyle =
                            stageState.status === "finalizado"
                              ? styles.operationStatusDone
                              : stageState.status === "em_andamento"
                                ? styles.operationStatusRunning
                                : styles.operationStatusWaiting;

                          return (
                            <div key={stage.key} style={styles.operationRow}>
                              <div style={styles.operationMain}>
                                <div style={styles.operationName}>{stage.label}</div>
                                <div style={{ ...styles.operationStatusBase, ...statusStyle }}>
                                  {statusLabel}
                                </div>
                              </div>

                              <div style={styles.operationTimes}>
                                <div><strong>Início:</strong> {stageState.start || "—"}</div>
                                <div><strong>Fim:</strong> {stageState.end || "—"}</div>
                              </div>

                              {stage.key === "atendimento" && (
                                <div style={styles.operationResponsibleGrid}>
                                  <div style={styles.field}>
                                    <label style={styles.label}>Atendente</label>
                                    <select
                                      style={styles.input}
                                      value={stageState.attendant || ""}
                                      onChange={(e) =>
                                        updateOperationalPerson(
                                          item.id,
                                          stage.key,
                                          "attendant",
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option value="">Selecione</option>
                                      {(settings.attendants || []).map((attendant) => (
                                        <option key={attendant} value={attendant}>
                                          {attendant}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              {stage.key === "procedimentoClinico" && (
                                <div style={styles.operationResponsibleGrid}>
                                  <div style={styles.field}>
                                    <label style={styles.label}>Técnico</label>
                                    <select
                                      style={styles.input}
                                      value={stageState.technician || ""}
                                      onChange={(e) =>
                                        updateOperationalPerson(
                                          item.id,
                                          stage.key,
                                          "technician",
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option value="">Selecione</option>
                                      {(settings.technicians || []).map((technician) => (
                                        <option key={technician} value={technician}>
                                          {technician}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              {stage.key === "ornamentacao" && (
                                <div style={styles.operationResponsibleGrid}>
                                  <div style={styles.field}>
                                    <label style={styles.label}>Apoio</label>
                                    <select
                                      style={styles.input}
                                      value={stageState.support || ""}
                                      onChange={(e) =>
                                        updateOperationalPerson(
                                          item.id,
                                          stage.key,
                                          "support",
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option value="">Selecione</option>
                                      {(settings.supports || []).map((support) => (
                                        <option key={support} value={support}>
                                          {support}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              {isTransportStage(stage.key) && (
                                <div style={styles.operationTransportGrid}>
                                  <div style={styles.field}>
                                    <label style={styles.label}>Motorista</label>
                                    <select
                                      style={styles.input}
                                      value={stageState.driver || ""}
                                      onChange={(e) =>
                                        updateOperationalTransport(
                                          item.id,
                                          stage.key,
                                          "driver",
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option value="">Selecione</option>
                                      {(settings.drivers || []).map((driver) => (
                                        <option key={driver} value={driver}>
                                          {driver}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div style={styles.field}>
                                    <label style={styles.label}>Carro</label>
                                    <select
                                      style={styles.input}
                                      value={stageState.car || ""}
                                      onChange={(e) =>
                                        updateOperationalTransport(
                                          item.id,
                                          stage.key,
                                          "car",
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option value="">Selecione</option>
                                      {(settings.cars || []).map((car) => (
                                        <option key={car} value={car}>
                                          {car}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              {!isTransportStage(stage.key) &&
                                stage.key !== "atendimento" &&
                                stage.key !== "procedimentoClinico" &&
                                stage.key !== "ornamentacao" && <div />}

                              <div style={styles.operationActions}>
                                <button
                                  style={styles.outlineDarkBtn}
                                  onClick={() => updateOperationalStage(item.id, stage.key, "start")}
                                  disabled={stageState.status === "em_andamento"}
                                >
                                  Iniciar
                                </button>
                                <button
                                  style={styles.primaryBtn}
                                  onClick={() => updateOperationalStage(item.id, stage.key, "finish")}
                                  disabled={stageState.status === "finalizado"}
                                >
                                  Finalizar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={styles.moduleFooterNote}>
            Depois podemos liberar um link só para visualização do andamento.
          </div>
        </section>
      )}

      {activeTab === "acompanhamento" && (
        <section style={styles.moduleCard}>
          <div style={styles.moduleHeader}>
            <div>
              <h2 style={styles.moduleTitle}>Tela de Acompanhamento</h2>
              <p style={styles.moduleSub}>
                Visualização simples do andamento do atendimento, ideal para acompanhamento pela equipe.
              </p>
            </div>
          </div>

          {atendimentos.length === 0 ? (
            <div style={styles.modulePlaceholder}>
              <div style={styles.modulePlaceholderTitle}>Nenhum atendimento disponível</div>
              <div style={styles.modulePlaceholderText}>
                Finalize um atendimento para liberar a visualização do acompanhamento.
              </div>
            </div>
          ) : (
            <>
              <div style={styles.searchRow}>
                <div style={{ ...styles.field, marginBottom: 0, flex: 1 }}>
                  <label style={styles.label}>Selecionar atendimento</label>
                  <select
                    style={styles.input}
                    value={viewingAttendanceId || ""}
                    onChange={(e) => setViewingAttendanceId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {atendimentos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.numero} - {item.falecido || "Sem nome informado"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!viewingAttendance ? (
                <div style={styles.modulePlaceholder}>
                  <div style={styles.modulePlaceholderTitle}>Selecione um atendimento</div>
                  <div style={styles.modulePlaceholderText}>
                    Escolha um atendimento salvo para visualizar o andamento das etapas.
                  </div>
                </div>
              ) : (
                <div style={styles.acompanhamentoWrap}>
                  <div style={styles.acompanhamentoHero}>
                    <div>
                      <div style={styles.recordNumber}>{viewingAttendance.numero}</div>
                      <div style={styles.recordName}>
                        {viewingAttendance.falecido || "Sem nome informado"}
                      </div>
                      <div style={styles.recordMeta}>
                        {viewingAttendance.unidade || "Unidade não informada"}
                        {viewingAttendance.sala ? ` • ${viewingAttendance.sala}` : ""}
                        {viewingAttendance.cemiterio ? ` • ${viewingAttendance.cemiterio}` : ""}
                      </div>
                    </div>
                    <div style={styles.statusBadge}>{viewingAttendance.status}</div>
                  </div>

                  <div style={styles.acompanhamentoInfoGrid}>
                    <div><strong>Responsável:</strong> {viewingAttendance.responsavelNome || "—"}</div>
                    <div><strong>Local do óbito:</strong> {viewingAttendance.localObito || "—"}</div>
                    <div><strong>Atendente geral:</strong> {viewingAttendance.atendente || "—"}</div>
                    <div><strong>Motorista geral:</strong> {viewingAttendance.motorista || "—"}</div>
                  </div>

                  <div style={styles.acompanhamentoStages}>
                    {OPERATION_STAGES.map((stage) => {
                      const stageState =
                        viewingAttendance.operationalStages?.[stage.key] || {
                          status: "nao_iniciado",
                          start: "",
                          end: "",
                          driver: "",
                          car: "",
                          attendant: "",
                          technician: "",
                          support: "",
                        };

                      const statusLabel = getOperationStatusLabel(stageState.status);
                      const statusStyle =
                        stageState.status === "finalizado"
                          ? styles.operationStatusDone
                          : stageState.status === "em_andamento"
                            ? styles.operationStatusRunning
                            : styles.operationStatusWaiting;

                      return (
                        <div key={stage.key} style={styles.acompanhamentoStageCard}>
                          <div style={styles.operationMain}>
                            <div style={styles.operationName}>{stage.label}</div>
                            <div style={{ ...styles.operationStatusBase, ...statusStyle }}>
                              {statusLabel}
                            </div>
                          </div>

                          <div style={styles.acompanhamentoTimes}>
                            <div><strong>Início:</strong> {stageState.start || "—"}</div>
                            <div><strong>Fim:</strong> {stageState.end || "—"}</div>
                          </div>

                          {stage.key === "atendimento" && (
                            <div style={styles.acompanhamentoExtra}>
                              <strong>Atendente:</strong> {stageState.attendant || "—"}
                            </div>
                          )}

                          {stage.key === "procedimentoClinico" && (
                            <div style={styles.acompanhamentoExtra}>
                              <strong>Técnico:</strong> {stageState.technician || "—"}
                            </div>
                          )}

                          {stage.key === "ornamentacao" && (
                            <div style={styles.acompanhamentoExtra}>
                              <strong>Apoio:</strong> {stageState.support || "—"}
                            </div>
                          )}

                          {isTransportStage(stage.key) && (
                            <div style={styles.acompanhamentoExtra}>
                              <div><strong>Motorista:</strong> {stageState.driver || "—"}</div>
                              <div><strong>Carro:</strong> {stageState.car || "—"}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === "atendimento" && (
        <>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Parte 1 — Atendimento</h2>

            <div style={styles.grid3}>
              <div style={styles.fieldWide}>
                <label style={styles.label}>Falecido</label>
                <input
                  style={styles.input}
                  value={form.falecido}
                  onChange={(e) => updateForm("falecido", e.target.value)}
                />
              </div>

              <div style={styles.fieldWide}>
                <label style={styles.label}>Local do óbito</label>
                <select
                  style={styles.input}
                  value={form.localObito}
                  onChange={(e) => updateForm("localObito", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {settings.hospitals.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldWide}>
                <label style={styles.label}>Cemitério</label>
                <select
                  style={styles.input}
                  value={form.cemiterio}
                  onChange={(e) => updateForm("cemiterio", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {settings.cemeteries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Local do velório</label>
                <select
                  style={styles.input}
                  value={form.velorioTipo}
                  onChange={(e) => {
                    updateForm("velorioTipo", e.target.value);
                    if (e.target.value !== "funeraria") {
                      updateForm("velorioUnidade", "");
                      updateForm("velorioSala", "");
                    }
                    if (e.target.value !== "igreja") {
                      updateForm("velorioNomeLocal", "");
                    }
                  }}
                >
                  <option value="funeraria">Funerária</option>
                  <option value="residencia">Residência</option>
                  <option value="igreja">Igreja</option>
                </select>
              </div>

              {form.velorioTipo === "funeraria" && (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Unidade</label>
                    <select
                      style={styles.input}
                      value={form.velorioUnidade}
                      onChange={(e) => {
                        updateForm("velorioUnidade", e.target.value);
                        updateForm("velorioSala", "");
                      }}
                    >
                      <option value="">Selecione</option>
                      {Object.keys(FUNERAL_UNITS).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Sala</label>
                    <select
                      style={styles.input}
                      value={form.velorioSala}
                      onChange={(e) => updateForm("velorioSala", e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {(FUNERAL_UNITS[form.velorioUnidade] || []).map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {form.velorioTipo !== "funeraria" && (
                <>
                  {form.velorioTipo === "igreja" && (
                    <div style={styles.fieldWide}>
                      <label style={styles.label}>Nome do local</label>
                      <input
                        style={styles.input}
                        value={form.velorioNomeLocal || ""}
                        onChange={(e) => updateForm("velorioNomeLocal", e.target.value)}
                      />
                    </div>
                  )}

                  <div style={styles.field}>
                    <label style={styles.label}>CEP</label>
                    <input
                      style={styles.input}
                      value={form.velorioCep}
                      onChange={(e) => handleCepChange(e.target.value, "velorio")}
                      placeholder="00000-000"
                    />
                    {cepStatus.velorio.loading ? (
                      <span style={styles.helpText}>Consultando CEP...</span>
                    ) : null}
                    {cepStatus.velorio.error ? (
                      <span style={styles.errorText}>{cepStatus.velorio.error}</span>
                    ) : null}
                  </div>

                  <div style={styles.fieldWide}>
                    <label style={styles.label}>Endereço</label>
                    <input
                      style={styles.input}
                      value={form.velorioEndereco}
                      onChange={(e) => updateForm("velorioEndereco", e.target.value)}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Número</label>
                    <input
                      style={styles.input}
                      value={form.velorioNumero}
                      onChange={(e) => updateForm("velorioNumero", e.target.value)}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Bairro</label>
                    <input
                      style={styles.input}
                      value={form.velorioBairro}
                      onChange={(e) => updateForm("velorioBairro", e.target.value)}
                    />
                  </div>
                </>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Data/Saída</label>
                <input
                  type="date"
                  style={styles.input}
                  value={form.dataSaida}
                  onChange={(e) => updateForm("dataSaida", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Hora/Saída</label>
                <input
                  type="time"
                  style={styles.input}
                  value={form.horaSaida}
                  onChange={(e) => updateForm("horaSaida", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Hora/Atendimento</label>
                <input
                  type="time"
                  style={styles.input}
                  value={form.horaAtendimento}
                  onChange={(e) => updateForm("horaAtendimento", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Data/Atendimento</label>
                <input
                  type="date"
                  style={styles.input}
                  value={form.dataAtendimento}
                  onChange={(e) => updateForm("dataAtendimento", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Chegou na clínica às</label>
                <input
                  type="time"
                  style={styles.input}
                  value={form.chegouClinica}
                  onChange={(e) => updateForm("chegouClinica", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Início às</label>
                <input
                  type="time"
                  style={styles.input}
                  value={form.inicioAs}
                  onChange={(e) => updateForm("inicioAs", e.target.value)}
                />
              </div>
            </div>

            <div style={styles.separator}></div>

            <div style={styles.field}>
              <label style={styles.label}>Tipo do atendimento</label>
              <select
                style={styles.input}
                value={form.tipoPlano}
                onChange={(e) => updateForm("tipoPlano", e.target.value)}
              >
                <option value="particular">Serviço Particular</option>
                <option value="socio">Serviço de Sócio</option>
              </select>
            </div>

            {form.tipoPlano === "socio" && (
              <div style={styles.grid3}>
                <div style={styles.field}>
                  <label style={styles.label}>Plano</label>
                  <input
                    style={styles.input}
                    value={form.plano}
                    onChange={(e) => updateForm("plano", e.target.value)}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Código</label>
                  <input
                    style={styles.input}
                    value={form.codigo}
                    onChange={(e) => updateForm("codigo", e.target.value)}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Dependente</label>
                  <input
                    style={styles.input}
                    value={form.dependente}
                    onChange={(e) => updateForm("dependente", e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Parte 2 — Serviços</h2>

            <div style={styles.infoRow}>
              <div style={styles.infoPill}>
                {selectedCount} serviço(s) selecionado(s)
              </div>
              <div style={styles.infoPill}>
                Total: R$ {formatMoney(totalValue)}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                style={styles.primaryBtn}
                onClick={() => setShowServicesModal(true)}
              >
                Selecionar Serviços
              </button>
            </div>


          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Parte 3 — Dados do Responsável</h2>

            <div style={styles.grid3}>
              <div style={styles.fieldWide}>
                <label style={styles.label}>Nome</label>
                <input
                  style={styles.input}
                  value={form.responsavelNome}
                  onChange={(e) => updateForm("responsavelNome", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>RG</label>
                <input
                  style={styles.input}
                  value={form.responsavelRg}
                  onChange={(e) => updateForm("responsavelRg", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>CPF</label>
                <input
                  style={styles.input}
                  value={form.responsavelCpf}
                  onChange={(e) => updateForm("responsavelCpf", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>CEP</label>
                <input
                  style={styles.input}
                  value={form.responsavelCep}
                  onChange={(e) => handleCepChange(e.target.value, "responsavel")}
                />
                {cepStatus.responsavel.loading && (
                  <span style={styles.helpText}>Buscando CEP...</span>
                )}
                {cepStatus.responsavel.error && (
                  <span style={styles.errorText}>
                    {cepStatus.responsavel.error}
                  </span>
                )}
              </div>

              <div style={styles.fieldWide}>
                <label style={styles.label}>Endereço</label>
                <input
                  style={styles.input}
                  value={form.responsavelEndereco}
                  onChange={(e) => updateForm("responsavelEndereco", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Número</label>
                <input
                  style={styles.input}
                  value={form.responsavelNumero}
                  onChange={(e) => updateForm("responsavelNumero", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Bairro</label>
                <input
                  style={styles.input}
                  value={form.responsavelBairro}
                  onChange={(e) => updateForm("responsavelBairro", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Celular 1</label>
                <input
                  style={styles.input}
                  value={form.responsavelCelular1}
                  onChange={(e) => updateForm("responsavelCelular1", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Celular 2</label>
                <input
                  style={styles.input}
                  value={form.responsavelCelular2}
                  onChange={(e) => updateForm("responsavelCelular2", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Parte 4 — Termo de Autorização</h2>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Parentesco</label>
                <input
                  style={styles.input}
                  value={form.parentesco}
                  onChange={(e) => updateForm("parentesco", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Tempo de velório</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={styles.input}
                    value={form.tempoVelorioValor}
                    onChange={(e) =>
                      updateForm("tempoVelorioValor", e.target.value)
                    }
                  />
                  <select
                    style={styles.input}
                    value={form.tempoVelorioUnidade}
                    onChange={(e) =>
                      updateForm("tempoVelorioUnidade", e.target.value)
                    }
                  >
                    <option value="horas">Horas</option>
                    <option value="dias">Dias</option>
                  </select>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Horário</label>
                <input
                  type="time"
                  style={styles.input}
                  value={form.horarioVelorio}
                  onChange={(e) => updateForm("horarioVelorio", e.target.value)}
                />
              </div>
            </div>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Roupa entregue para</label>
                <select
                  style={styles.input}
                  value={form.roupaEntreguePara}
                  onChange={(e) => updateForm("roupaEntreguePara", e.target.value)}
                >
                  <option value="motorista">Motorista</option>
                  <option value="recepção">Recepção</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Religião</label>
                <select
                  style={styles.input}
                  value={form.religiao}
                  onChange={(e) => updateForm("religiao", e.target.value)}
                >
                  <option value="católico">Católico</option>
                  <option value="evangélico">Evangélico</option>
                  <option value="espírita">Espírita</option>
                  <option value="sem religião">Sem religião</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Técnico</label>
                <select
                  style={styles.input}
                  value={form.tecnico}
                  onChange={(e) => updateForm("tecnico", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {(settings.technicians || []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.separator}></div>

            <h3 style={{ color: "#0B7285" }}>Do Corpo</h3>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Condições</label>
                <select
                  style={styles.input}
                  value={form.necropsia}
                  onChange={(e) => updateForm("necropsia", e.target.value)}
                >
                  <option value="nao">Não necropsiado</option>
                  <option value="sim">Necropsiado</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Chegou vestido</label>
                <select
                  style={styles.input}
                  value={form.veioVestido}
                  onChange={(e) => {
                    updateForm("veioVestido", e.target.value);
                    if (e.target.value !== "sim") updateForm("roupaDestino", "");
                  }}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Retirar esmalte</label>
                <select
                  style={styles.input}
                  value={form.retirarEsmalte}
                  onChange={(e) => updateForm("retirarEsmalte", e.target.value)}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
            </div>

            {form.veioVestido === "sim" && (
              <div style={styles.field}>
                <label style={styles.label}>Roupa: devolver ou descartar</label>
                <select
                  style={styles.input}
                  value={form.roupaDestino}
                  onChange={(e) => updateForm("roupaDestino", e.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="devolver">Devolver</option>
                  <option value="descartar">Descartar</option>
                </select>
              </div>
            )}

            <div style={styles.separator}></div>

            <h3 style={{ color: "#0B7285" }}>Da Estética</h3>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Barbear</label>
                <select
                  style={styles.input}
                  value={form.barbear}
                  onChange={(e) => updateForm("barbear", e.target.value)}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Bigode</label>
                <select
                  style={styles.input}
                  value={form.bigode}
                  onChange={(e) => updateForm("bigode", e.target.value)}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Cavanhaque</label>
                <select
                  style={styles.input}
                  value={form.cavanhaque}
                  onChange={(e) => updateForm("cavanhaque", e.target.value)}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
            </div>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Maquiagem</label>
                <select
                  style={styles.input}
                  value={form.maquiagem}
                  onChange={(e) => {
                    updateForm("maquiagem", e.target.value);
                    if (e.target.value !== "sim") {
                      updateForm("maquiagemTipo", "");
                    }
                  }}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>

              {form.maquiagem === "sim" && (
                <div style={styles.field}>
                  <label style={styles.label}>Tipo de maquiagem</label>
                  <select
                    style={styles.input}
                    value={form.maquiagemTipo}
                    onChange={(e) => updateForm("maquiagemTipo", e.target.value)}
                  >
                    <option value="leve">Leve</option>
                    <option value="natural">Natural</option>
                    <option value="forte">Forte</option>
                  </select>
                </div>
              )}
            </div>

            <div style={styles.separator}></div>

            <h3 style={{ color: "#0B7285" }}>Ornato e Adorno</h3>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Ornamentação com flores</label>
                <select
                  style={styles.input}
                  value={form.ornamentacao}
                  onChange={(e) => {
                    updateForm("ornamentacao", e.target.value);
                    if (e.target.value !== "sim") updateForm("tipoFlor", "");
                  }}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>

              {form.ornamentacao === "sim" && (
                <div style={styles.field}>
                  <label style={styles.label}>Flores</label>
                  <select
                    style={styles.input}
                    value={form.tipoFlor}
                    onChange={(e) => updateForm("tipoFlor", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="naturais">Naturais</option>
                    <option value="artificiais">Artificiais</option>
                  </select>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Joias</label>
                <select
                  style={styles.input}
                  value={form.joias}
                  onChange={(e) => {
                    updateForm("joias", e.target.value);
                    if (e.target.value !== "sim") updateForm("joiasQuais", "");
                  }}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
            </div>

            {form.joias === "sim" && (
              <div style={styles.field}>
                <label style={styles.label}>Quais joias</label>
                <input
                  style={styles.input}
                  value={form.joiasQuais}
                  onChange={(e) => updateForm("joiasQuais", e.target.value)}
                />
              </div>
            )}

            <div style={styles.separator}></div>

            <h3 style={{ color: "#0B7285" }}>Geral</h3>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Modelo da urna</label>
                <select
                  style={styles.input}
                  value={form.modeloUrna}
                  onChange={(e) => {
                    updateForm("modeloUrna", e.target.value);
                    if (e.target.value !== "luxo") updateForm("refUrna", "");
                  }}
                >
                  <option value="0X">0X</option>
                  <option value="plano">Plano</option>
                  <option value="luxo">Luxo</option>
                </select>
              </div>

              {form.modeloUrna === "luxo" && (
                <div style={styles.field}>
                  <label style={styles.label}>REF:</label>
                  <input
                    style={styles.input}
                    value={form.refUrna}
                    onChange={(e) => updateForm("refUrna", e.target.value)}
                  />
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Cor da urna</label>
                <select
                  style={styles.input}
                  value={form.corUrna}
                  onChange={(e) => updateForm("corUrna", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {(settings.coffinColors || []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Atendente</label>
                <select
                  style={styles.input}
                  value={form.atendenteGeral}
                  onChange={(e) => updateForm("atendenteGeral", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {(settings.attendants || []).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Motorista</label>
                <select
                  style={styles.input}
                  value={form.motorista}
                  onChange={(e) => updateForm("motorista", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {(settings.drivers || []).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Carro</label>
                <select
                  style={styles.input}
                  value={form.carroGeral}
                  onChange={(e) => updateForm("carroGeral", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {(settings.cars || []).map((car) => (
                    <option key={car} value={car}>
                      {car}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Observação</label>
              <textarea
                style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                value={form.observacaoTermo}
                onChange={(e) => updateForm("observacaoTermo", e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 18,
              }}
            >
              <button style={styles.primaryBtn} onClick={finalizarAtendimento}>
                Finalizar Atendimento
              </button>
            </div>
          </section>
        </>
      )}

      {activeTab === "config" && session.role === "ADM" && (
        <div style={styles.grid2}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Usuários</h2>

            <div style={styles.grid2Simple}>
              <div style={styles.field}>
                <label style={styles.label}>Nome</label>
                <input
                  style={styles.input}
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Login</label>
                <input
                  style={styles.input}
                  value={newUser.login}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, login: e.target.value }))
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Senha</label>
                <input
                  style={styles.input}
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Função</label>
                <select
                  style={styles.input}
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  <option value="ADM">ADM</option>
                  <option value="OPERADOR">Operador</option>
                </select>
              </div>
            </div>

            <button style={styles.primaryBtn} onClick={addUser}>
              Adicionar usuário
            </button>

            <div style={{ marginTop: 16 }}>
              {users.map((u) => (
                <div key={u.id} style={styles.listItem}>
                  <div>
                    <strong>{u.name}</strong> — {u.login} ({u.role})
                  </div>

                  {u.login !== "admin" && (
                    <button
                      style={styles.outlineDarkBtn}
                      onClick={() => removeUser(u.id)}
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cadastros dinâmicos</h2>

            <div style={styles.field}>
              <label style={styles.label}>Novo hospital / local do óbito</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newHospital}
                  onChange={(e) => setNewHospital(e.target.value)}
                />
                <button style={styles.primaryBtn} onClick={addHospital}>
                  Adicionar
                </button>
              </div>
            </div>

            {settings.hospitals.map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeHospital(item)}
                >
                  Remover
                </button>
              </div>
            ))}

            <div style={{ height: 18 }} />

            <div style={styles.field}>
              <label style={styles.label}>Novo cemitério</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newCemetery}
                  onChange={(e) => setNewCemetery(e.target.value)}
                />
                <button style={styles.primaryBtn} onClick={addCemetery}>
                  Adicionar
                </button>
              </div>
            </div>

            {settings.cemeteries.map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeCemetery(item)}
                >
                  Remover
                </button>
              </div>
            ))}

            <div style={{ height: 18 }} />

            <div style={styles.field}>
              <label style={styles.label}>Nova cor de urna</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newCoffinColor}
                  onChange={(e) => setNewCoffinColor(e.target.value)}
                />
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    addSettingItem(
                      "coffinColors",
                      newCoffinColor.toUpperCase(),
                      setNewCoffinColor
                    )
                  }
                >
                  Adicionar
                </button>
              </div>
            </div>

            {(settings.coffinColors || []).map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeSettingItem("coffinColors", item)}
                >
                  Remover
                </button>
              </div>
            ))}

            <div style={{ height: 18 }} />

            <div style={styles.field}>
              <label style={styles.label}>Novo técnico</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newTechnician}
                  onChange={(e) => setNewTechnician(e.target.value)}
                />
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    addSettingItem(
                      "technicians",
                      newTechnician.toUpperCase(),
                      setNewTechnician
                    )
                  }
                >
                  Adicionar
                </button>
              </div>
            </div>

            {(settings.technicians || []).map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeSettingItem("technicians", item)}
                >
                  Remover
                </button>
              </div>
            ))}

            <div style={{ height: 18 }} />

            <div style={styles.field}>
              <label style={styles.label}>Novo apoio</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newSupport}
                  onChange={(e) => setNewSupport(e.target.value)}
                />
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    addSettingItem(
                      "supports",
                      newSupport.toUpperCase(),
                      setNewSupport
                    )
                  }
                >
                  Adicionar
                </button>
              </div>
            </div>

            {(settings.supports || []).map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeSettingItem("supports", item)}
                >
                  Remover
                </button>
              </div>
            ))}

            <div style={{ height: 18 }} />

            <div style={styles.field}>
              <label style={styles.label}>Novo atendente</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newAttendant}
                  onChange={(e) => setNewAttendant(e.target.value)}
                />
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    addSettingItem(
                      "attendants",
                      newAttendant.toUpperCase(),
                      setNewAttendant
                    )
                  }
                >
                  Adicionar
                </button>
              </div>
            </div>

            {(settings.attendants || []).map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeSettingItem("attendants", item)}
                >
                  Remover
                </button>
              </div>
            ))}

            <div style={{ height: 18 }} />

            <div style={styles.field}>
              <label style={styles.label}>Novo motorista</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                />
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    addSettingItem(
                      "drivers",
                      newDriver.toUpperCase(),
                      setNewDriver
                    )
                  }
                >
                  Adicionar
                </button>
              </div>
            </div>

            {(settings.drivers || []).map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeSettingItem("drivers", item)}
                >
                  Remover
                </button>
              </div>
            ))}

            <div style={{ height: 18 }} />

            <div style={styles.field}>
              <label style={styles.label}>Novo carro</label>
              <div style={styles.row}>
                <input
                  style={styles.input}
                  value={newCar}
                  onChange={(e) => setNewCar(e.target.value)}
                  placeholder="Ex: STRADA - QWE1A23"
                />
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    addSettingItem(
                      "cars",
                      newCar.toUpperCase(),
                      setNewCar
                    )
                  }
                >
                  Adicionar
                </button>
              </div>
            </div>

            {(settings.cars || []).map((item) => (
              <div key={item} style={styles.listItem}>
                <span>{item}</span>
                <button
                  style={styles.outlineDarkBtn}
                  onClick={() => removeSettingItem("cars", item)}
                >
                  Remover
                </button>
              </div>
            ))}
          </section>
        </div>
      )}

      {showServicesModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHead}>
              <h2 style={{ margin: 0, color: "var(--brand-accent)" }}>
                Selecionar Serviços
              </h2>
              <button
                style={styles.outlineDarkBtn}
                onClick={() => setShowServicesModal(false)}
              >
                Fechar
              </button>
            </div>

            <div style={styles.servicesGrid}>
              {services.map((item, index) => (
                <div
                  key={item.name}
                  style={{
                    ...styles.serviceCard,
                    borderColor: item.checked
                      ? "var(--brand-accent)"
                      : "var(--border-soft)",
                    background: item.checked
                      ? (isDark ? "#172033" : "#F0FBFD")
                      : "var(--card-bg-soft)",
                  }}
                >
                  <div style={styles.serviceTop}>
                    <label
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleService(index)}
                      />
                      {item.name}
                    </label>
                  </div>

                  <div style={styles.grid2Simple}>
                    <div style={styles.field}>
                      <label style={styles.label}>Quantidade</label>
                      <input
                        style={{
                          ...styles.input,
                          background: isDark ? "#0f172a" : "#ffffff",
                          color: isDark ? "#e5e7eb" : "#17313A",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                        }}
                        value={item.qty}
                        onChange={(e) =>
                          updateService(index, "qty", e.target.value)
                        }
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Valor</label>
                      <input
                        style={{
                          ...styles.input,
                          background: isDark ? "#0f172a" : "#ffffff",
                          color: isDark ? "#e5e7eb" : "#17313A",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                        }}
                        value={item.value}
                        onChange={(e) =>
                          updateService(index, "value", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {item.name === "COROA DE FLORES" && (
                    <div style={styles.field}>
                      <label style={styles.label}>Frase</label>
                      <input
                        style={{
                          ...styles.input,
                          background: isDark ? "#0f172a" : "#ffffff",
                          color: isDark ? "#e5e7eb" : "#17313A",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                        }}
                        value={item.note}
                        onChange={(e) =>
                          updateService(index, "note", e.target.value)
                        }
                      />
                    </div>
                  )}

                  {item.name === "OUTRAS DESPESAS" && (
                    <div style={styles.field}>
                      <label style={styles.label}>Descrição</label>
                      <input
                        style={{
                          ...styles.input,
                          background: isDark ? "#0f172a" : "#ffffff",
                          color: isDark ? "#e5e7eb" : "#17313A",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                        }}
                        value={item.note}
                        onChange={(e) =>
                          updateService(index, "note", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {pdfPreview.open && (
        <div style={styles.previewOverlay}>
          <div style={styles.previewModal}>
            <div style={styles.previewHeader}>
              <h3 style={{ margin: 0 }}>{pdfPreview.title}</h3>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={styles.outlineDarkBtn} onClick={printPreviewPdf}>
                  🖨 Imprimir
                </button>
                <button style={styles.primaryBtn} onClick={downloadPreviewPdf}>
                  ⬇ Download
                </button>
                <button style={styles.outlineDangerBtn} onClick={closePdfPreview}>
                  ✖ Fechar
                </button>
              </div>
            </div>

            <iframe
              src={pdfPreview.url}
              title="Pré-visualização PDF"
              style={styles.previewFrame}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--page-bg)",
    fontFamily: "Arial, sans-serif",
    padding: 20,
    color: "var(--text-main)",
  },
  loginPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--login-bg)",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },
  loginCard: {
    width: "100%",
    maxWidth: 430,
    background: "var(--card-bg-soft)",
    borderRadius: 18,
    padding: 30,
    boxShadow: "var(--shadow-main)",
  },
  loginBrandWrap: {
    textAlign: "center",
    marginBottom: 18,
  },
  loginLogo: {
    width: 220,
    maxWidth: "100%",
    display: "block",
    margin: "0 auto 14px",
    objectFit: "contain",
  },
  loginTitle: {
    textAlign: "center",
    margin: 0,
    color: "var(--brand-accent)",
  },
  loginSub: {
    textAlign: "center",
    marginTop: 8,
    color: "var(--text-muted)",
    marginBottom: 20,
  },
  header: {
    background: "var(--header-bg)",
    borderRadius: 18,
    padding: 22,
    color: "var(--brand-text)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 16,
    boxShadow: "var(--shadow-main)",
  },
  headerBrand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  headerLogo: {
    width: 84,
    height: "auto",
    display: "block",
    objectFit: "contain",
  },
  brandTop: {
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  pageTitle: {
    margin: 0,
    fontSize: 28,
  },
  brandSub: {
    fontSize: 15,
    opacity: 0.96,
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "var(--header-box-bg)",
    borderRadius: 14,
    padding: "10px 12px",
  },
  tabs: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid var(--tab-border)",
    background: "var(--card-bg-soft)",
    cursor: "pointer",
    fontWeight: 700,
    color: "var(--info-pill-text)",
  },
  tabActive: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid var(--tab-active-bg)",
    background: "var(--primary-btn)",
    cursor: "pointer",
    fontWeight: 700,
    color: "var(--brand-text)",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 16,
  },
  grid2Simple: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  card: {
    background: "var(--card-bg-soft)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "var(--shadow-main)",
    border: "1px solid var(--border-soft)",
    marginBottom: 16,
  },
  cardTitle: {
    marginTop: 0,
    color: "var(--brand-accent)",
    marginBottom: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  },
  fieldWide: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-soft)",
  },
  input: {
    border: "1px solid var(--input-border)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "var(--card-bg-soft)",
    color: "var(--text-main)",
    caretColor: "#17313A",
    width: "100%",
    boxSizing: "border-box",
  },
  primaryBtn: {
    background: "var(--primary-btn)",
    color: "var(--primary-btn-text)",
    border: "none",
    padding: "11px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  outlineBtn: {
    background: "var(--outline-bg)",
    color: "var(--brand-accent)",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  outlineDarkBtn: {
    background: "var(--outline-bg)",
    color: "var(--brand-accent)",
    border: "1px solid #0B7285",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  errorBox: {
    marginBottom: 12,
    padding: 10,
    background: "#FFE7E7",
    color: "var(--danger-text)",
    borderRadius: 10,
  },
  separator: {
    height: 1,
    background: "#E2EDF0",
    margin: "10px 0 16px",
  },
  previewBox: {
    maxHeight: 460,
    overflowY: "auto",
    border: "1px solid var(--border-soft)",
    borderRadius: 14,
    padding: 10,
    background: "var(--card-bg-alt)",
  },
  previewItem: {
    border: "1px solid",
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 8,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  infoRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  infoPill: {
    background: "var(--info-pill-bg)",
    border: "1px solid var(--border-soft)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--info-pill-text)",
  },
  helpText: {
    fontSize: 12,
    color: "var(--brand-accent)",
  },
  errorText: {
    fontSize: 12,
    color: "#C0392B",
  },
  row: {
    display: "flex",
    gap: 10,
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    border: "1px solid var(--border-soft)",
    background: "var(--card-bg-soft)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  homeHero: {
    marginBottom: 20,
  },
  homeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  },
  homeCard: {
    background: "var(--outline-bg)",
    border: "none",
    borderRadius: 24,
    padding: "30px 26px",
    minHeight: 150,
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "var(--shadow-main)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  homeCardTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--brand-accent)",
    marginBottom: 10,
  },
  homeCardText: {
    fontSize: 16,
    color: "var(--text-muted)",
  },
  homePanels: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginBottom: 16,
  },
  homePanel: {
    background: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "var(--shadow-main)",
  },
  homePanelTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "var(--brand-accent)",
    fontSize: 24,
  },
  homeListItem: {
    background: "var(--outline-bg)",
    borderRadius: 16,
    padding: "16px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
  },
  homeListSub: {
    fontSize: 13,
    color: "var(--text-muted)",
    marginTop: 4,
  },
  miniActionBtn: {
    background: "var(--primary-btn)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  progressRow: {
    background: "var(--outline-bg)",
    borderRadius: 16,
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
  },
  progressName: {
    fontWeight: 700,
    color: "var(--text-soft)",
  },
  progressBadge: {
    background: "var(--info-pill-bg)",
    color: "var(--brand-accent)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  homeLinkRow: {
    marginTop: 12,
    color: "var(--text-soft)",
    fontSize: 14,
  },


  moduleCard: {
    background: "var(--module-bg)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "var(--shadow-main)",
    marginBottom: 24,
  },
  moduleHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 22,
  },
  moduleTitle: {
    margin: 0,
    color: "#0C7FA3",
    fontSize: 34,
    fontWeight: 800,
  },
  moduleSub: {
    margin: "6px 0 0",
    color: "var(--text-soft)",
    fontSize: 15,
  },
  modulePlaceholder: {
    background: "var(--outline-bg)",
    borderRadius: 24,
    padding: 28,
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px rgba(12,127,163,0.08)",
  },
  modulePlaceholderTitle: {
    color: "var(--text-main)",
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 10,
  },
  modulePlaceholderText: {
    color: "var(--text-muted)",
    fontSize: 16,
    lineHeight: 1.6,
    maxWidth: 780,
  },

  searchRow: {
    display: "flex",
    gap: 12,
    marginBottom: 14,
  },
  recordsList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  recordCard: {
    background: "var(--outline-bg)",
    border: "1px solid var(--border-soft)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 10px 20px rgba(0,0,0,0.10)",
  },
  recordTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  recordNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--brand-accent)",
    marginBottom: 4,
  },
  recordName: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text-main)",
    marginBottom: 4,
  },
  recordMeta: {
    fontSize: 13,
    color: "#6A7D87",
  },
  recordGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    color: "var(--text-soft)",
    fontSize: 14,
    marginBottom: 14,
  },
  recordActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  statusBadge: {
    background: "var(--info-pill-bg)",
    color: "var(--brand-accent)",
    border: "1px solid #CDEBF1",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  outlineDangerBtn: {
    background: "var(--outline-bg)",
    color: "var(--danger-text)",
    border: "1px solid var(--danger-border)",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },

  operationalCard: {
    background: "var(--outline-bg)",
    border: "1px solid var(--border-soft)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 10px 20px rgba(0,0,0,0.10)",
  },
  operationalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  operationGrid: {
    display: "grid",
    gap: 12,
  },
  operationRow: {
    background: "var(--card-bg-alt)",
    border: "1px solid var(--border-soft)",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 1.1fr) minmax(140px, 0.8fr) minmax(260px, 1.2fr) auto",
    gap: 12,
    alignItems: "center",
  },
  operationMain: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  operationName: {
    color: "var(--text-main)",
    fontSize: 16,
    fontWeight: 800,
  },
  operationStatusBase: {
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: 12,
    border: "1px solid transparent",
  },
  operationStatusWaiting: {
    background: "#F2F5F7",
    color: "#6B7B83",
    borderColor: "#D7E0E5",
  },
  operationStatusRunning: {
    background: "#E6F7FD",
    color: "#0C7FA3",
    borderColor: "#BEE5F0",
  },
  operationStatusDone: {
    background: "#E7F7EC",
    color: "#237A45",
    borderColor: "#C5E7D0",
  },
  operationTimes: {
    display: "grid",
    gap: 4,
    color: "var(--text-muted)",
    fontSize: 13,
  },
  operationTransportGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    alignItems: "end",
  },
  operationResponsibleGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    alignItems: "end",
  },
  operationActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  acompanhamentoWrap: {
    display: "grid",
    gap: 16,
  },
  acompanhamentoHero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
    borderRadius: 18,
    background: "var(--card-bg-alt)",
    border: "1px solid var(--border-soft)",
    flexWrap: "wrap",
  },
  acompanhamentoInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    background: "var(--card-bg-soft)",
    border: "1px solid var(--border-soft)",
    borderRadius: 16,
    padding: 16,
  },
  acompanhamentoStages: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 14,
  },
  acompanhamentoStageCard: {
    background: "var(--card-bg-soft)",
    border: "1px solid var(--border-soft)",
    borderRadius: 16,
    padding: 16,
    display: "grid",
    gap: 10,
  },
  acompanhamentoTimes: {
    display: "grid",
    gap: 4,
    color: "var(--text-soft)",
    fontSize: 14,
  },
  acompanhamentoExtra: {
    display: "grid",
    gap: 4,
    color: "var(--text-main)",
    fontSize: 14,
    paddingTop: 6,
    borderTop: "1px solid #E6F0F4",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(8, 22, 28, 0.55)",
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    width: "100%",
    maxWidth: 1150,
    maxHeight: "90vh",
    overflowY: "auto",
    background: "var(--card-bg-soft)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  serviceCard: {
    border: "1px solid",
    borderRadius: 14,
    padding: 14,
  },
  serviceTop: {
    marginBottom: 12,
  },
};
previewOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 20,
},

previewModal: {
  width: "100%",
  maxWidth: 1100,
  height: "90vh",
  background: "var(--card-bg)",
  border: "1px solid var(--border-soft)",
  borderRadius: 18,
  boxShadow: "var(--shadow-main)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
},

previewHeader: {
  padding: 16,
  borderBottom: "1px solid var(--border-soft)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
},

previewFrame: {
  width: "100%",
  height: "100%",
  border: "none",
  background: "#fff",
},