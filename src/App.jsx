import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { supabase } from "./lib/supabaseClient.js";
import Equipe from "./pages/Equipe.jsx";
import AcompanhamentoPublico from "./AcompanhamentoPublico.jsx";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";
import { gerarFichaPdf } from "./pdf/gerarFichaPDF";
import { drawCell } from "./pdf/pdfHelpers";
import { gerarTermoPdf } from "./pdf/gerarTermoPdf";

const STORAGE_KEYS = {
  users: "sf_users_v3",
  settings: "sf_settings_v3",
  session: "sf_session_v3",
  attendances: "sf_attendances_v1",
  activeTab: "sf_active_tab_v1",
};

const OPERATION_STAGES = [
  { key: "atendimento", label: "Serviço" },
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
  embarques: [],
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
  "embarques",
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
      startedBy: "",
      startedById: "",
      startedAt: "",
      finishedBy: "",
      finishedById: "",
      finishedAt: "",
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
    dataFalecimento: todayDate(),
    horaFalecimento: currentTime(),
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
    cidadeDestino: "",
    embarque: "",

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
      "--page-bg": "#0f1720",
      "--login-bg": "linear-gradient(135deg, #0f1720, #111827)",
      "--text-main": "#f3f4f6",
      "--text-soft": "#d1d5db",
      "--text-muted": "#94a3b8",
      "--brand-text": "#f9fafb",
      "--brand-accent": "#26b1c4",
      "--card-bg": "#111827",
      "--card-bg-soft": "#162131",
      "--card-bg-alt": "#1d2939",
      "--module-bg": "#162131",
      "--input-bg": "#1d2939",
      "--input-border": "#314155",
      "--input-text": "#f3f4f6",
      "--border-soft": "rgba(148, 163, 184, 0.2)",
      "--header-bg": "rgba(17, 24, 39, 0.92)",
      "--header-box-bg": "rgba(29, 41, 57, 0.96)",
      "--tab-bg": "#162131",
      "--tab-text": "#dbe4ea",
      "--tab-border": "rgba(148, 163, 184, 0.18)",
      "--tab-active-bg": "#26b1c4",
      "--tab-active-text": "#ffffff",
      "--primary-btn": "#26b1c4",
      "--primary-btn-text": "#ffffff",
      "--outline-bg": "#1d2939",
      "--outline-text": "#e5e7eb",
      "--outline-border": "rgba(148, 163, 184, 0.24)",
      "--danger-text": "#fecaca",
      "--danger-border": "rgba(239, 68, 68, 0.35)",
      "--info-pill-bg": "rgba(38, 177, 196, 0.16)",
      "--info-pill-text": "#8be0eb",
      "--status-bg": "rgba(38, 177, 196, 0.16)",
      "--status-text": "#8be0eb",
      "--status-border": "rgba(38, 177, 196, 0.22)",
      "--placeholder-bg": "#1d2939",
      "--shadow-main": "0 10px 30px rgba(0,0,0,0.22)",
    };
  }

  return {
    "--page-bg": "#f4f7f6",
    "--login-bg": "linear-gradient(135deg, #f4f7f6, #eef4f3)",
    "--text-main": "#333333",
    "--text-soft": "#4b5563",
    "--text-muted": "#666666",
    "--brand-text": "#333333",
    "--brand-accent": "#26b1c4",
    "--card-bg": "#ffffff",
    "--card-bg-soft": "#ffffff",
    "--card-bg-alt": "#f9fbfb",
    "--module-bg": "#ffffff",
    "--input-bg": "#f8fbfb",
    "--input-border": "#d9e4e2",
    "--input-text": "#333333",
    "--border-soft": "#e5ecea",
    "--header-bg": "rgba(255,255,255,0.88)",
    "--header-box-bg": "#ffffff",
    "--tab-bg": "#ffffff",
    "--tab-text": "#5c6670",
    "--tab-border": "#dfe8e6",
    "--tab-active-bg": "#26b1c4",
    "--tab-active-text": "#ffffff",
    "--primary-btn": "#26b1c4",
    "--primary-btn-text": "#ffffff",
    "--outline-bg": "#ffffff",
    "--outline-text": "#333333",
    "--outline-border": "#dfe8e6",
    "--danger-text": "#dc2626",
    "--danger-border": "rgba(220, 38, 38, 0.18)",
    "--info-pill-bg": "rgba(38, 177, 196, 0.1)",
    "--info-pill-text": "#1d7f8f",
    "--status-bg": "rgba(38, 177, 196, 0.1)",
    "--status-text": "#1d7f8f",
    "--status-border": "rgba(38, 177, 196, 0.18)",
    "--placeholder-bg": "#ffffff",
    "--shadow-main": "0 10px 30px rgba(0,0,0,0.05)",
  };
}



function normalizeRole(role = "") {
  return role === "OPERADOR" ? "ATENDENTE" : role;
}

function getRoleUiLabel(role = "") {
  const normalized = normalizeRole(role);
  if (normalized === "ADM") return "ADM";
  if (normalized === "EQUIPE") return "EQUIPE";
  return "ATENDENTE";
}

function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [session, setSession] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState(() =>
    loadStorage(STORAGE_KEYS.activeTab, "home")
  );
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
  const [newEmbarque, setNewEmbarque] = useState("");
  const [expandedOperations, setExpandedOperations] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({
    atendimentoParte1: false,
    atendimentoParte2: false,
    atendimentoParte3: true,
    atendimentoParte4: true,
  });
  const [newUser, setNewUser] = useState({
    name: "",
    login: "",
    password: "",
    role: "ATENDENTE",
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

  const isEquipeRoute = window.location.pathname === "/equipe";

  

  useEffect(() => {
    saveStorage("sf_theme_v1", theme);
  }, [theme]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.activeTab, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const savedSession = loadStorage(STORAGE_KEYS.session, null);
    if (savedSession) {
      setSession({ ...savedSession, role: normalizeRole(savedSession?.role) });
    }
  }, []);

  useEffect(() => {
  saveStorage(STORAGE_KEYS.attendances, atendimentos);

  }, [atendimentos]);

  useEffect(() => {
    function syncTrackingRoute() {
      const trackingId = getTrackingIdFromPath();
      setPublicTrackingId(trackingId || "");
      if (trackingId) {
        setViewingAttendanceId(trackingId);
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

  const operationalAttendances = useMemo(() => {
    return atendimentos.filter(
      (item) =>
        item &&
        ["Aguardando início", "Em andamento", "Em progresso"].includes(item.status)
    );
  }, [atendimentos]);

  const viewingAttendance = useMemo(() => {
    if (!viewingAttendanceId) return null;
    return atendimentos.find((item) => item.id === viewingAttendanceId) || null;
  }, [viewingAttendanceId, atendimentos]);

  const atendimentosEquipe = useMemo(() => {
    return atendimentos.filter(
      (item) =>
        item &&
        item.equipeAcionada === true &&
        ["Aguardando início", "Em andamento", "Em progresso"].includes(item.status)
    );
  }, [atendimentos]);

  const currentAttendanceRecord = useMemo(() => {
    if (!editingAttendanceId) return null;
    return atendimentos.find((item) => item.id === editingAttendanceId) || null;
  }, [editingAttendanceId, atendimentos]);

  function formatDateTimeBR(value) {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("pt-BR");
    } catch {
      return String(value);
    }
  }

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

  function toggleSection(sectionKey) {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
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

        setUsers((finalUsers || []).map((user) => ({ ...user, role: normalizeRole(user.role) })));
        setSettings(finalSettings);
      } catch (error) {
        console.error("Erro ao carregar usuários/configurações:", error);
        setUsers((localUsers || DEFAULT_USERS).map((user) => ({ ...user, role: normalizeRole(user.role) })));
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

    const normalizedUser = { ...user, role: normalizeRole(user.role) };
    setSession(normalizedUser);
    saveStorage(STORAGE_KEYS.session, normalizedUser);
    setLoginError("");
  }

  function handleLogout() {
    setSession(null);
    saveStorage(STORAGE_KEYS.session, null);
    saveStorage(STORAGE_KEYS.activeTab, "home");
    setLogin("");
    setPassword("");
    setLoginError("");
    setFinalizado(false);
    setActiveTab("home");
    setEditingAttendanceId(null);
    setViewingAttendanceId(null);

    if (typeof window !== "undefined" && window.location.pathname === "/equipe") {
      window.location.href = "/";
    }
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

  useEffect(() => {
    const channel = supabase
      .channel("realtime-atendimentos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atendimentos",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = String(payload.old?.record_id || "");

            setAtendimentos((prev) =>
              prev.filter((item) => String(item.id) !== deletedId)
            );

            if (editingAttendanceId === deletedId) {
              resetAtendimento();
            }

            if (viewingAttendanceId === deletedId) {
              setViewingAttendanceId(null);
            }

            return;
          }

          const novoRegistro = payload.new?.dados || payload.new;
          const novoId = String(payload.new?.record_id || novoRegistro?.id || "");

          if (!novoId) return;

          setAtendimentos((prev) => {
            const exists = prev.some((item) => String(item.id) === novoId);

            if (exists) {
              return prev.map((item) =>
                String(item.id) === novoId ? novoRegistro : item
              );
            }

            return [novoRegistro, ...prev];
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime atendimentos:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editingAttendanceId, viewingAttendanceId]);


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

  async function toggleEquipeAcionada(attendanceId, shouldActivate) {
    await updateAttendanceRecord(attendanceId, (item) => ({
      ...item,
      equipeAcionada: shouldActivate,
      acionadoEm: shouldActivate ? new Date().toISOString() : item.acionadoEm || "",
      updatedAt: new Date().toISOString(),
    }));
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
      equipeAcionada: existingRecord?.equipeAcionada || false,
      acionadoEm: existingRecord?.acionadoEm || "",
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
        startedBy: "",
        startedById: "",
        startedAt: "",
        finishedBy: "",
        finishedById: "",
        finishedAt: "",
      };

      if (action === "start") {
        nextStages[stageKey] = {
          ...currentStage,
          status: "em_andamento",
          start: currentStage.start || now,
          end: "",
          startedBy: session?.name || currentStage.startedBy || "",
          startedById: session?.id || currentStage.startedById || "",
          startedAt: currentStage.startedAt || new Date().toISOString(),
        };
      }

      if (action === "finish") {
        nextStages[stageKey] = {
          ...currentStage,
          status: "finalizado",
          start: currentStage.start || now,
          end: now,
          finishedBy: session?.name || "",
          finishedById: session?.id || "",
          finishedAt: new Date().toISOString(),
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
      role: "ATENDENTE",
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

  function gerarFichaPDF() {
  gerarFichaPdf({
    form,
    services,
    totalValue,
    drawCell,
    formatDateBR,
    formatMoney,
    openPdfPreview,
  });
}

function gerarTermoPDF() {
  gerarTermoPdf({
    form,
    formatDateBR,
    openPdfPreview,
  });
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
  function renderEquipeContainer() {
    return (
      <div style={{ ...styles.page, ...themeVars }}>
        <div style={{ ...styles.headerWrap, marginBottom: 16 }}>
          <div style={styles.headerBox}>
            <div>
              <div style={styles.brandTitle}>Painel da Equipe</div>
              <div style={styles.brandSub}>Acompanhamento operacional da equipe em campo.</div>
            </div>
            <button style={styles.outlineBtn} onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket" style={styles.buttonIcon} /> Sair
            </button>
          </div>
        </div>

        <Equipe
          atendimentos={atendimentosEquipe}
          updateOperationalStage={updateOperationalStage}
          formatDateBR={formatDateBR}
        />
      </div>
    );
  }

  if (session && normalizeRole(session.role) === "EQUIPE") {
    return renderEquipeContainer();
  }

  if (isEquipeRoute) {
    return renderEquipeContainer();
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
            <><i className="fa-solid fa-house" style={styles.buttonIcon} /> Início</>
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Serviço Finalizado</h2>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              style={styles.outlineDarkBtn}
              onClick={() => setFinalizado(false)}
            >
              <><i className="fa-solid fa-pen" style={styles.buttonIcon} /> Editar</>
            </button>

            <button
              style={styles.outlineDarkBtn}
              onClick={() => {
                setFinalizado(false);
                setActiveTab("atendimentos");
              }}
            >
              <><i className="fa-solid fa-rectangle-list" style={styles.buttonIcon} /> Serviços</>
            </button>

            <button style={styles.primaryBtn} onClick={gerarFichaPDF}>
              <><i className="fa-solid fa-file-invoice" style={styles.buttonIcon} /> Gerar Ficha PDF</>
            </button>

            <button style={styles.primaryBtn} onClick={gerarTermoPDF}>
              <><i className="fa-solid fa-file-lines" style={styles.buttonIcon} /> Gerar Termo PDF</>
            </button>
          </div>

        </div>

        {pdfPreview.open && (
          <div style={styles.previewOverlay}>
            <div style={styles.previewModal}>
              <div style={styles.previewHeader}>
                <h3 style={{ margin: 0 }}>{pdfPreview.title}</h3>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={styles.outlineDarkBtn} onClick={printPreviewPdf}>
                    <><i className="fa-solid fa-print" style={styles.buttonIcon} /> Imprimir</>
                  </button>
                  <button style={styles.primaryBtn} onClick={downloadPreviewPdf}>
                    <><i className="fa-solid fa-download" style={styles.buttonIcon} /> Download</>
                  </button>
                  <button style={styles.outlineDangerBtn} onClick={closePdfPreview}>
                    <><i className="fa-solid fa-xmark" style={styles.buttonIcon} /> Fechar</>
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

  if (isPublicAcompanhamento) {
    return <AcompanhamentoPublico trackingId={publicTrackingId} />;
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
    <div className="app-shell" style={themeVars}>
      {activeTab === "home" && (
        <header className="home-header">
          <div className="home-brand">
            <img
              src="/logo.png"
              alt="Logo Grupo São Francisco"
              className="home-brand-logo"
            />
            <div className="home-brand-copy">
              <div className="home-brand-title">GRUPO SÃO FRANCISCO</div>
              <div className="home-brand-subtitle">Assistência e cuidado em todos os momentos</div>
            </div>
          </div>

          <div className="home-actions">
            <div className="user-pill">
              <div className="user-pill-avatar">
                {getInitials(session?.name || "U")}
              </div>
              <div className="user-pill-copy">
                <span className="user-pill-label">{session?.name}</span>
                <span className="user-pill-sublabel">{getRoleUiLabel(session?.role)}</span>
              </div>
            </div>

            {normalizeRole(session?.role) === "ADM" && (
              <button
                className="home-utility-button"
                onClick={() => setActiveTab("config")}
                title="Configurações"
              >
                <i className="fa-solid fa-gear" />
              </button>
            )}

            <button
              className="home-utility-button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              title={isDark ? "Claro" : "Escuro"}
            >
              <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"}`} />
            </button>

            <button className="home-utility-button" onClick={handleLogout} title="Sair">
              <i className="fa-solid fa-right-from-bracket" />
            </button>
          </div>
        </header>
      )}

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
            Novo Serviço
          </button>

          <button
            style={activeTab === "atendimentos" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("atendimentos")}
          >
            Serviços
          </button>

          <button
            style={activeTab === "operacional" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("operacional")}
          >
            Gestão de Etapas
          </button>

          <button
            style={activeTab === "equipe" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("equipe")}
          >
            Equipe
          </button>

          {normalizeRole(session?.role) === "ADM" && (
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
        <section className="home-screen">
          <div className="home-cards-grid">
            <button
              className="home-action-card"
              onClick={() => {
                resetAtendimento();
                setFinalizado(false);
                setActiveTab("atendimento");
              }}
            >
              <div className="home-action-icon">
                <i className="fa-solid fa-circle-plus" />
              </div>
              <div className="home-action-content">
                <div className="home-action-title">NOVO SERVIÇO</div>
                <div className="home-action-text">Iniciar novo serviço</div>
              </div>
            </button>

            <button
              className="home-action-card"
              onClick={() => setActiveTab("atendimentos")}
            >
              <div className="home-action-icon">
                <i className="fa-solid fa-file-lines" />
              </div>
              <div className="home-action-content">
                <div className="home-action-title">SERVIÇOS</div>
                <div className="home-action-text">Consultar, editar e reabrir registros</div>
              </div>
            </button>

            <button
              className="home-action-card"
              onClick={() => setActiveTab("operacional")}
            >
              <div className="home-action-icon">
                <i className="fa-solid fa-diagram-project" />
              </div>
              <div className="home-action-content">
                <div className="home-action-title">GESTÃO DE ETAPAS</div>
                <div className="home-action-text">Acompanhar etapas e serviços em andamento</div>
              </div>
            </button>
          </div>

          <footer className="home-footer">
            © 2026 Caetano Digital System. All Rights Reserved.
          </footer>
        </section>
      )}

      {activeTab === "atendimentos" && (
        <section style={styles.moduleCard}>
          <div style={styles.moduleHeader}>
            <div>
              <h2 style={styles.moduleTitle}>Serviços</h2>
              <p style={styles.moduleSub}>
                Consulte os serviços salvos, abra novamente para PDF e edite quando precisar.
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
              Novo Serviço
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
                    <div><strong>Equipe:</strong> {item.equipeAcionada ? "Acionada" : "Não acionada"}</div>
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
                      onClick={() => {
                        const link = `${window.location.origin}/acompanhamento/${item.id}`;
                        navigator.clipboard.writeText(link);
                        alert("Link da família copiado!");
                      }}
                    >
                      📲 Copiar link da família
                    </button>
                    <button
                      style={item.equipeAcionada ? styles.outlineDarkBtn : styles.primaryBtn}
                      onClick={() => toggleEquipeAcionada(item.id, !item.equipeAcionada)}
                    >
                      {item.equipeAcionada ? "Cancelar acionamento" : "Acionar equipe"}
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
              <h2 style={styles.moduleTitle}>Gestão de Etapas</h2>
              <p style={styles.moduleSub}>
                Controle o início e o fim de cada etapa do atendimento.
              </p>
            </div>
          </div>

          {operationalAttendances.length === 0 ? (
            <div style={styles.modulePlaceholder}>
              <div style={styles.modulePlaceholderTitle}>Nenhum atendimento disponível</div>
              <div style={styles.modulePlaceholderText}>
                Apenas atendimentos aguardando início ou em andamento aparecem no painel operacional.
              </div>
            </div>
          ) : (
            <div style={styles.recordsList}>
              {operationalAttendances.map((item) => {
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

                              {(normalizeRole(session?.role) === "ADM" || normalizeRole(session?.role) === "ATENDENTE") && (
                                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                                  <div style={styles.infoRow}>
                                    <div style={styles.infoPill}>
                                      Iniciado por: {stageState.startedBy || "—"}
                                    </div>
                                    <div style={styles.infoPill}>
                                      Finalizado por: {stageState.finishedBy || "—"}
                                    </div>
                                  </div>
                                </div>
                              )}

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
          </div>
        </section>
      )}

      

      {activeTab === "equipe" && (
        <Equipe
          atendimentos={atendimentosEquipe}
          updateOperationalStage={updateOperationalStage}
          formatDateBR={formatDateBR}
        />
      )}

      {activeTab === "atendimento" && (
        <>
          <section style={styles.card}>
            <button
              type="button"
              style={styles.sectionToggle}
              onClick={() => toggleSection("atendimentoParte1")}
            >
              <span style={styles.cardTitle}>Parte 1 — Serviço</span>
              <span style={styles.sectionToggleIcon}>
                {collapsedSections.atendimentoParte1 ? "＋" : "−"}
              </span>
            </button>

            {!collapsedSections.atendimentoParte1 && (
              <>
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
                    const value = e.target.value;
                    updateForm("velorioTipo", value);
                    if (value !== "funeraria") {
                      updateForm("velorioUnidade", "");
                      updateForm("velorioSala", "");
                    }
                    if (value !== "igreja") {
                      updateForm("velorioNomeLocal", "");
                    }
                    if (value !== "residencia" && value !== "igreja") {
                      updateForm("velorioCep", "");
                      updateForm("velorioEndereco", "");
                      updateForm("velorioNumero", "");
                      updateForm("velorioBairro", "");
                    }
                    if (value !== "viagem") {
                      updateForm("cidadeDestino", "");
                      updateForm("embarque", "");
                    }
                  }}
                >
                  <option value="funeraria">Funerária</option>
                  <option value="residencia">Residência</option>
                  <option value="igreja">Igreja</option>
                  <option value="viagem">Vai viajar</option>
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

              {(form.velorioTipo === "residencia" || form.velorioTipo === "igreja") && (
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

              {form.velorioTipo === "viagem" && (
                <>
                  <div style={styles.fieldWide}>
                    <label style={styles.label}>Cidade de destino</label>
                    <input
                      style={styles.input}
                      value={form.cidadeDestino}
                      onChange={(e) => updateForm("cidadeDestino", e.target.value)}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Local de embarque</label>
                    <select
                      style={styles.input}
                      value={form.embarque}
                      onChange={(e) => updateForm("embarque", e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {settings.embarques.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Data/Falecimento</label>
                <input
                  type="date"
                  style={styles.input}
                  value={form.dataFalecimento}
                  onChange={(e) => updateForm("dataFalecimento", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Hora/Falecimento</label>
                <input
                  type="time"
                  style={styles.input}
                  value={form.horaFalecimento}
                  onChange={(e) => updateForm("horaFalecimento", e.target.value)}
                />
              </div>

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
                <label style={styles.label}>Hora/Serviço</label>
                <input
                  type="time"
                  style={styles.input}
                  value={form.horaAtendimento}
                  onChange={(e) => updateForm("horaAtendimento", e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Data/Serviço</label>
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
                <option value="particular">Serviço PARTICULAR</option>
                <option value="socio">ASSOCIADO</option>
                <option value="pm">POLICIA MILITAR (DPS AM)</option>
  <option value="tokyo">TOKYO MARINE (ASSEGURADORA)</option>
  <option value="casai">CASAI (DSEI MANAUS)</option>
  <option value="autazes">PREFEITURA DE AUTAZES</option>
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
              </>
            )}
          </section>

          <section style={styles.card}>
            <button
              type="button"
              style={styles.sectionToggle}
              onClick={() => toggleSection("atendimentoParte2")}
            >
              <span style={styles.cardTitle}>Parte 2 — Serviços</span>
              <span style={styles.sectionToggleIcon}>
                {collapsedSections.atendimentoParte2 ? "＋" : "−"}
              </span>
            </button>

            {!collapsedSections.atendimentoParte2 && (
              <>
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
              </>
            )}
          </section>

          <section style={styles.card}>
            <button
              type="button"
              style={styles.sectionToggle}
              onClick={() => toggleSection("atendimentoParte3")}
            >
              <span style={styles.cardTitle}>Parte 3 — Dados do Responsável</span>
              <span style={styles.sectionToggleIcon}>
                {collapsedSections.atendimentoParte3 ? "＋" : "−"}
              </span>
            </button>

            {!collapsedSections.atendimentoParte3 && (
              <>
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
              </>
            )}
          </section>

          <section style={styles.card}>
            <button
              type="button"
              style={styles.sectionToggle}
              onClick={() => toggleSection("atendimentoParte4")}
            >
              <span style={styles.cardTitle}>Parte 4 — Termo de Autorização</span>
              <span style={styles.sectionToggleIcon}>
                {collapsedSections.atendimentoParte4 ? "＋" : "−"}
              </span>
            </button>

            {!collapsedSections.atendimentoParte4 && (
              <>
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
                Finalizar Serviço
              </button>
            </div>
              </>
            )}
          </section>
        </>
      )}

      {activeTab === "config" && normalizeRole(session.role) === "ADM" && (
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
                  <option value="ATENDENTE">Atendente</option>
                  <option value="EQUIPE">Equipe</option>
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
                  <><i className="fa-solid fa-print" style={styles.buttonIcon} /> Imprimir</>
                </button>
                <button style={styles.primaryBtn} onClick={downloadPreviewPdf}>
                  <><i className="fa-solid fa-download" style={styles.buttonIcon} /> Download</>
                </button>
                <button style={styles.outlineDangerBtn} onClick={closePdfPreview}>
                  <><i className="fa-solid fa-xmark" style={styles.buttonIcon} /> Fechar</>
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
  page: { minHeight: "100vh", background: "var(--page-bg)", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: 24, color: "var(--text-main)" },
  loginPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--login-bg)", padding: 24, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  loginCard: { width: "100%", maxWidth: 450, background: "var(--card-bg-soft)", borderRadius: 24, padding: 36, boxShadow: "var(--shadow-main)", border: "1px solid var(--border-soft)" },
  loginBrandWrap: { textAlign: "center", marginBottom: 22 },
  loginLogo: { width: 220, maxWidth: "100%", display: "block", margin: "0 auto 14px", objectFit: "contain" },
  loginTitle: { textAlign: "center", margin: 0, color: "var(--text-main)", fontSize: 28, fontWeight: 800, letterSpacing: 0.4 },
  loginSub: { textAlign: "center", marginTop: 8, color: "var(--text-muted)", marginBottom: 22, fontSize: 14 },
  header: { background: "var(--header-bg)", borderRadius: 24, padding: 20, color: "var(--brand-text)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 18, boxShadow: "var(--shadow-main)", border: "1px solid var(--border-soft)", backdropFilter: "blur(14px)", flexWrap: "wrap" },
  headerBrand: { display: "flex", alignItems: "center", gap: 14 },
  headerLogo: { width: 72, height: 72, display: "block", objectFit: "contain", borderRadius: 18, background: "rgba(38, 177, 196, 0.08)", padding: 10 },
  headerTools: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginLeft: "auto" },
  headerSearch: { display: "flex", alignItems: "center", gap: 10, minWidth: 320, background: "var(--card-bg-soft)", borderRadius: 999, border: "1px solid var(--border-soft)", padding: "0 14px", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" },
  headerSearchInput: { border: "none", outline: "none", background: "transparent", color: "var(--text-main)", width: "100%", height: 44, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' },
  searchIcon: { color: "var(--text-muted)", fontSize: 14 },
  notificationBtn: { width: 44, height: 44, borderRadius: 999, border: "1px solid var(--border-soft)", background: "var(--card-bg-soft)", color: "var(--text-main)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-main)" },
  brandTop: { fontSize: 26, fontWeight: 800, letterSpacing: 1, marginBottom: 4 },
  pageTitle: { margin: 0, fontSize: 28 },
  brandSub: { fontSize: 14, color: "var(--text-muted)" },
  userBox: { display: "flex", alignItems: "center", gap: 12, background: "var(--header-box-bg)", borderRadius: 18, padding: "10px 14px", border: "1px solid var(--border-soft)", minWidth: 200 },
  userAvatar: { width: 42, height: 42, borderRadius: 999, background: "linear-gradient(135deg, #26b1c4, #1d8ea0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, letterSpacing: 0.8, boxShadow: "0 8px 20px rgba(38, 177, 196, 0.24)" },
  userMeta: { display: "grid", gap: 2 },
  userName: { fontWeight: 700, color: "var(--text-main)", fontSize: 14 },
  userRole: { fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 },
  buttonIcon: { marginRight: 8 },
  tabs: { display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" },
  tab: { padding: "12px 16px", borderRadius: 14, border: "1px solid var(--tab-border)", background: "var(--tab-bg)", cursor: "pointer", fontWeight: 700, color: "var(--tab-text)", boxShadow: "var(--shadow-main)" },
  tabActive: { padding: "12px 16px", borderRadius: 14, border: "1px solid var(--tab-active-bg)", background: "var(--tab-active-bg)", cursor: "pointer", fontWeight: 700, color: "var(--tab-active-text)", boxShadow: "0 10px 24px rgba(38, 177, 196, 0.24)" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 },
  grid2Simple: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  card: { background: "var(--card-bg-soft)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow-main)", border: "1px solid var(--border-soft)", marginBottom: 18 },
  cardTitle: { marginTop: 0, color: "var(--text-main)", marginBottom: 16, fontSize: 24, fontWeight: 800 },
  sectionToggle: { width: "100%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, marginBottom: 18, cursor: "pointer", textAlign: "left" },
  sectionToggleIcon: { fontSize: 22, lineHeight: 1, color: "var(--brand-accent)", fontWeight: 700, minWidth: 24, textAlign: "center" },
  field: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  fieldWide: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: 0.6 },
  input: { border: "1px solid var(--input-border)", borderRadius: 12, padding: "12px 14px", fontSize: 14, outline: "none", background: "var(--input-bg)", color: "var(--input-text)", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s ease, box-shadow 0.2s ease", boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.02)" },
  primaryBtn: { background: "var(--primary-btn)", color: "var(--primary-btn-text)", border: "none", padding: "12px 18px", borderRadius: 14, cursor: "pointer", fontWeight: 700, boxShadow: "0 10px 24px rgba(38, 177, 196, 0.22)" },
  outlineBtn: { background: "var(--outline-bg)", color: "var(--outline-text)", border: "1px solid var(--outline-border)", padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontWeight: 700, boxShadow: "var(--shadow-main)" },
  outlineDarkBtn: { background: "var(--outline-bg)", color: "var(--outline-text)", border: "1px solid var(--outline-border)", padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontWeight: 700, boxShadow: "var(--shadow-main)" },
  errorBox: { marginBottom: 12, padding: 12, background: "rgba(254, 226, 226, 0.9)", color: "var(--danger-text)", borderRadius: 12, border: "1px solid var(--danger-border)" },
  separator: { height: 1, background: "var(--border-soft)", margin: "12px 0 18px" },
  previewBox: { maxHeight: 460, overflowY: "auto", border: "1px solid var(--border-soft)", borderRadius: 18, padding: 12, background: "var(--card-bg-alt)" },
  previewItem: { border: "1px solid var(--border-soft)", borderRadius: 16, padding: "12px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", background: "var(--card-bg-soft)" },
  infoRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  infoPill: { background: "var(--info-pill-bg)", border: "1px solid var(--status-border)", borderRadius: 999, padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "var(--info-pill-text)" },
  helpText: { fontSize: 12, color: "var(--brand-accent)" },
  errorText: { fontSize: 12, color: "#dc2626" },
  row: { display: "flex", gap: 10 },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: "1px solid var(--border-soft)", background: "var(--card-bg-soft)", borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: "var(--shadow-main)" },
  homeHero: { marginBottom: 22 },
  homeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  homeCard: { background: "linear-gradient(135deg, #26b1c4, #229aad)", border: "none", borderRadius: 24, padding: "26px 24px", minHeight: 126, cursor: "pointer", textAlign: "left", boxShadow: "0 18px 34px rgba(38, 177, 196, 0.22)", display: "flex", alignItems: "center", gap: 18, color: "#ffffff" },
  homeCardIcon: { width: 62, height: 62, borderRadius: 18, background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#ffffff", flexShrink: 0 },
  homeCardTitle: { fontSize: 18, fontWeight: 800, color: "#ffffff", marginBottom: 6, letterSpacing: 0.8 },
  homeCardText: { fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 },
  homePanels: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 16 },
  homePanel: { background: "rgba(255,255,255,0.92)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow-main)", border: "1px solid var(--border-soft)" },
  homePanelTitle: { marginTop: 0, marginBottom: 16, color: "var(--text-main)", fontSize: 22 },
  homeListItem: { background: "var(--outline-bg)", borderRadius: 16, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, boxShadow: "var(--shadow-main)", border: "1px solid var(--border-soft)" },
  homeListSub: { fontSize: 13, color: "var(--text-muted)", marginTop: 4 },
  miniActionBtn: { background: "var(--primary-btn)", color: "#FFFFFF", border: "none", borderRadius: 12, padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  progressRow: { background: "var(--outline-bg)", borderRadius: 16, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, boxShadow: "var(--shadow-main)", border: "1px solid var(--border-soft)" },
  progressName: { fontWeight: 700, color: "var(--text-soft)" },
  progressBadge: { background: "var(--info-pill-bg)", color: "var(--brand-accent)", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 },
  homeLinkRow: { marginTop: 12, color: "var(--text-soft)", fontSize: 14 },
  moduleCard: { background: "var(--module-bg)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow-main)", marginBottom: 24, border: "1px solid var(--border-soft)" },
  moduleHeader: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 22 },
  moduleTitle: { margin: 0, color: "var(--text-main)", fontSize: 28, fontWeight: 800 },
  moduleSub: { margin: "6px 0 0", color: "var(--text-muted)", fontSize: 14 },
  modulePlaceholder: { background: "var(--card-bg-alt)", borderRadius: 22, padding: 28, minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "center", border: "1px solid var(--border-soft)" },
  modulePlaceholderTitle: { color: "var(--text-main)", fontSize: 24, fontWeight: 800, marginBottom: 10 },
  modulePlaceholderText: { color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 780 },
  searchRow: { display: "flex", gap: 12, marginBottom: 14 },
  recordsList: { display: "flex", flexDirection: "column", gap: 14 },
  recordCard: { background: "var(--card-bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 20, padding: 20, boxShadow: "var(--shadow-main)" },
  recordTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  recordNumber: { fontSize: 12, fontWeight: 700, color: "var(--brand-accent)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  recordName: { fontSize: 20, fontWeight: 800, color: "var(--text-main)", marginBottom: 4 },
  recordMeta: { fontSize: 13, color: "var(--text-muted)" },
  recordGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, color: "var(--text-soft)", fontSize: 14, marginBottom: 14 },
  recordActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  statusBadge: { background: "var(--status-bg)", color: "var(--status-text)", border: "1px solid var(--status-border)", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 },
  outlineDangerBtn: { background: "var(--outline-bg)", color: "var(--danger-text)", border: "1px solid var(--danger-border)", padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontWeight: 700 },
  operationalCard: { background: "var(--card-bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 20, padding: 20, boxShadow: "var(--shadow-main)" },
  operationalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 },
  operationGrid: { display: "grid", gap: 12 },
  operationRow: { background: "var(--card-bg-alt)", border: "1px solid var(--border-soft)", borderRadius: 18, padding: 16, display: "grid", gridTemplateColumns: "minmax(180px, 1.1fr) minmax(140px, 0.8fr) minmax(260px, 1.2fr) auto", gap: 12, alignItems: "center" },
  operationMain: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  operationName: { color: "var(--text-main)", fontSize: 16, fontWeight: 800 },
  operationStatusBase: { borderRadius: 999, padding: "8px 12px", fontWeight: 700, fontSize: 12, border: "1px solid transparent" },
  operationStatusWaiting: { background: "#f3f4f6", color: "#6b7280", borderColor: "#e5e7eb" },
  operationStatusRunning: { background: "rgba(38, 177, 196, 0.12)", color: "#1d7f8f", borderColor: "rgba(38, 177, 196, 0.2)" },
  operationStatusDone: { background: "rgba(34, 197, 94, 0.12)", color: "#15803d", borderColor: "rgba(34, 197, 94, 0.18)" },
  operationTimes: { display: "grid", gap: 4, color: "var(--text-muted)", fontSize: 13 },
  operationTransportGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" },
  operationResponsibleGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 10, alignItems: "end" },
  operationActions: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  acompanhamentoWrap: { display: "grid", gap: 16 },
  acompanhamentoHero: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: 18, borderRadius: 20, background: "var(--card-bg-alt)", border: "1px solid var(--border-soft)", flexWrap: "wrap" },
  acompanhamentoInfoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, background: "var(--card-bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 18, padding: 18 },
  acompanhamentoStages: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 },
  acompanhamentoStageCard: { background: "var(--card-bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 18, padding: 18, display: "grid", gap: 10, boxShadow: "var(--shadow-main)" },
  acompanhamentoTimes: { display: "grid", gap: 4, color: "var(--text-soft)", fontSize: 14 },
  acompanhamentoExtra: { display: "grid", gap: 4, color: "var(--text-main)", fontSize: 14, paddingTop: 6, borderTop: "1px solid var(--border-soft)" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", padding: 20, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modalBox: { width: "100%", maxWidth: 1150, maxHeight: "90vh", overflowY: "auto", background: "var(--card-bg-soft)", borderRadius: 24, padding: 22, boxShadow: "0 24px 64px rgba(15, 23, 42, 0.16)", border: "1px solid var(--border-soft)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 },
  servicesGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  serviceCard: { border: "1px solid var(--border-soft)", borderRadius: 18, padding: 16, background: "var(--card-bg-alt)", boxShadow: "var(--shadow-main)" },
  serviceTop: { marginBottom: 12 },
  previewOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 },
  previewModal: { width: "100%", maxWidth: 1100, height: "90vh", background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 24, boxShadow: "0 28px 80px rgba(15, 23, 42, 0.24)", display: "flex", flexDirection: "column", overflow: "hidden" },
  previewHeader: { padding: 16, borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  previewFrame: { width: "100%", height: "100%", border: "none", background: "#fff" },
};
