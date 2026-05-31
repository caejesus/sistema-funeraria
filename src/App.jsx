import React, { useEffect, useMemo, useState } from "react";
import Equipe from "./pages/Equipe.jsx";
import AcompanhamentoPublico from "./AcompanhamentoPublico.jsx";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";
import { gerarFichaPdf } from "./pdf/gerarFichaPDF";
import { drawCell } from "./pdf/pdfHelpers";
import { gerarTermoPdf } from "./pdf/gerarTermoPDF";
import { gerarFichaTecnicoPdf } from "./pdf/gerarFichaTecnicoPDF";

import { STORAGE_KEYS, FUNERAL_UNITS, SERVICE_TYPE_OPTIONS, initialServices } from "./constants";
import { formatDateBR, formatMoney, moneyToNumber } from "./utils/format";
import { normalizeRole, getRoleUiLabel, getInitials, getAttendanceOperationalStatus } from "./utils/attendance";
import { loadStorage, saveStorage } from "./utils/storage";
import { getInitialForm } from "./utils/initialForm";
import { getThemeVars, styles } from "./styles/appStyles";

import { usePdfPreview } from "./hooks/usePdfPreview";
import { useCep } from "./hooks/useCep";
import { useSettings } from "./hooks/useSettings";
import { useAtendimentos } from "./hooks/useAtendimentos";

import { PdfPreviewModal } from "./components/PdfPreviewModal";
import { ServicosModal } from "./components/ServicosModal";
import { ServicosTab } from "./components/ServicosTab";
import { OperacionalTab } from "./components/OperacionalTab";
import { ConfigTab } from "./components/ConfigTab";
import { OrdemServicoTab } from "./components/OrdemServicoTab";
import { ServicosDoDia } from "./components/ServicosDoDia";

import { useOrdemServico } from "./hooks/useOrdemServico";

export default function App() {
  // --- Auth ---
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // --- Navigation ---
  const [activeTab, setActiveTab] = useState(() => loadStorage(STORAGE_KEYS.activeTab, "home"));
  const [finalizado, setFinalizado] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [viewingAttendanceId, setViewingAttendanceId] = useState(null);
  const [publicTrackingId, setPublicTrackingId] = useState("");
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    atendimentoParte1: false,
    atendimentoParte2: false,
    atendimentoParte3: true,
    atendimentoParte4: true,
  });

  // --- Form ---
  const [form, setForm] = useState(() => getInitialForm());
  const [services, setServices] = useState(initialServices);

  // --- Theme ---
  const [theme, setTheme] = useState(() => loadStorage("sf_theme_v1", "dark"));
  const isDark = theme === "dark";
  const themeVars = getThemeVars(isDark);

  const [osConvertidaMensagem, setOsConvertidaMensagem] = useState("");

  // --- Hooks ---
  const { pdfPreview, openPdfPreview, closePdfPreview, downloadPreviewPdf, printPreviewPdf } =
    usePdfPreview();

  const { cepStatus, handleCepChange } = useCep(setForm);

  const { users, settings, bootLoading, addSettingItem, removeSettingItem, addUser, removeUser } =
    useSettings();

  const {
    ordens,
    ordensAtivas,
    criarOrdem,
    atualizarStatus: atualizarStatusOs,
    cancelarOrdem,
    converterEmAtendimento,
    marcarComoConvertida,
  } = useOrdemServico();

  const {
    atendimentos,
    deleteAttendance,
    toggleEquipeAcionada,
    finalizarAtendimento,
    updateOperationalStage,
    updateOperationalTransport,
    updateOperationalPerson,
  } = useAtendimentos({
    session,
    editingAttendanceId,
    viewingAttendanceId,
    setForm,
    setServices,
    setViewingAttendanceId,
    setEditingAttendanceId,
    setFinalizado,
    onRecordDeleted: (deletedId) => {
      if (editingAttendanceId === deletedId) resetAtendimento();
      if (viewingAttendanceId === deletedId) setViewingAttendanceId(null);
    },
  });

  // --- Computed ---
  const selectedCount = useMemo(() => services.filter((s) => s.checked).length, [services]);

  const totalValue = useMemo(
    () => services.reduce((acc, item) => acc + (item.checked ? moneyToNumber(item.value) : 0), 0),
    [services]
  );

  const operationalAttendances = useMemo(
    () =>
      atendimentos.filter(
        (item) =>
          item &&
          ["Aguardando início", "Em andamento", "Em progresso"].includes(item.status)
      ),
    [atendimentos]
  );

  const servicosDoDia = useMemo(() => {
    const hj = new Date().toISOString().slice(0, 10);
    return atendimentos.filter((item) => item?.form?.dataSaida === hj);
  }, [atendimentos]);

  const atendimentosEquipe = useMemo(
    () =>
      atendimentos.filter(
        (item) =>
          item &&
          item.equipeAcionada === true &&
          ["Aguardando início", "Em andamento", "Em progresso"].includes(item.status)
      ),
    [atendimentos]
  );

  // --- Effects ---
  useEffect(() => { saveStorage("sf_theme_v1", theme); }, [theme]);
  useEffect(() => { saveStorage(STORAGE_KEYS.activeTab, activeTab); }, [activeTab]);
  useEffect(() => { saveStorage(STORAGE_KEYS.attendances, atendimentos); }, [atendimentos]);

  useEffect(() => {
    const savedSession = loadStorage(STORAGE_KEYS.session, null);
    if (savedSession) setSession({ ...savedSession, role: normalizeRole(savedSession?.role) });
  }, []);

  useEffect(() => {
    function syncTrackingRoute() {
      const trackingId = getTrackingIdFromPath();
      setPublicTrackingId(trackingId || "");
      if (trackingId) setViewingAttendanceId(trackingId);
    }
    syncTrackingRoute();
    window.addEventListener("popstate", syncTrackingRoute);
    return () => window.removeEventListener("popstate", syncTrackingRoute);
  }, []);

  // --- Helpers ---
  function getTrackingIdFromPath() {
    if (typeof window === "undefined") return "";
    const match = window.location.pathname.match(/^\/acompanhamento\/([^/]+)/);
    return match?.[1] || "";
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleService(index) {
    setServices((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  }

  function updateService(index, field, value) {
    setServices((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function toggleSection(sectionKey) {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }

  function handleLogin(e) {
    e.preventDefault();
    if (bootLoading) { setLoginError("Aguarde o carregamento dos usuários."); return; }
    const user = users.find((u) => u.login === login && u.password === password);
    if (!user) { setLoginError("Usuário ou senha inválidos."); return; }
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
    setOsConvertidaMensagem("");
    setActiveTab("home");
  }

  async function handleConvertOsToAtendimento(recordId) {
    const dadosOs = converterEmAtendimento(recordId);
    if (!dadosOs) return;

    await marcarComoConvertida(recordId);

    setForm({
      ...getInitialForm(),
      falecido:            dadosOs.falecido           || "",
      sexo:                dadosOs.sexo               || "",
      peso:                dadosOs.peso               || "",
      altura:              dadosOs.altura             || "",
      localObito:          dadosOs.localObito         || "",
      motorista:           dadosOs.motorista          || "",
      carroGeral:          dadosOs.carroGeral         || "",
      observacaoTermo:     dadosOs.observacaoTermo    || "",
      responsavelNome:     dadosOs.responsavelNome    || "",
      responsavelCelular1: dadosOs.responsavelTelefone || "",
      ...(dadosOs.isSvo ? {
        responsavelCep:      dadosOs.cep      || "",
        responsavelEndereco: dadosOs.endereco || "",
        responsavelNumero:   dadosOs.numero   || "",
      } : {}),
    });
    setServices(initialServices);
    setShowServicesModal(false);
    setFinalizado(false);
    setEditingAttendanceId(null);
    setOsConvertidaMensagem(`OS ${dadosOs._osNumero} convertida. Atendimento iniciado!`);
    setActiveTab("atendimento");
  }

  function openAttendance(record, mode = "edit") {
    setForm(record.form);
    setServices(record.services);
    setEditingAttendanceId(record.id);
    setShowServicesModal(false);
    setFinalizado(mode === "preview");
    setActiveTab(mode === "preview" ? "atendimentos" : "atendimento");
  }

  async function handleDeleteAttendance(id) {
    const deleted = await deleteAttendance(id);
    if (deleted && editingAttendanceId === id) resetAtendimento();
  }

  function gerarFichaPDF() {
    gerarFichaPdf({ form, services, totalValue, drawCell, formatDateBR, formatMoney, openPdfPreview });
  }

  function gerarTermoPDF() {
    gerarTermoPdf({ form, formatDateBR, openPdfPreview });
  }

  function gerarFichaTecnicaPDF() {
    const currentRecord = atendimentos.find((i) => i.id === editingAttendanceId);
    const numero = currentRecord?.numero || "";
    gerarFichaTecnicoPdf({ form, services, numero, openPdfPreview });
  }

  // --- Route guards ---
  const isEquipeRoute = window.location.pathname === "/equipe";
  const isPublicAcompanhamento = !!publicTrackingId;

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
          ordensAtivas={ordensAtivas}
          atualizarStatusOs={atualizarStatusOs}
          servicosDoDia={servicosDoDia}
        />
      </div>
    );
  }

  if (session && normalizeRole(session.role) === "EQUIPE") return renderEquipeContainer();
  if (isEquipeRoute) return renderEquipeContainer();

  if (finalizado) {
    return (
      <div style={{ ...styles.page, ...themeVars }}>
        <div style={{ marginBottom: 20 }}>
          <button style={styles.outlineDarkBtn} onClick={resetAtendimento}>
            <i className="fa-solid fa-house" style={styles.buttonIcon} /> Início
          </button>
        </div>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Atendimento Finalizado</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={styles.outlineDarkBtn} onClick={() => setFinalizado(false)}>
              <i className="fa-solid fa-pen" style={styles.buttonIcon} /> Editar
            </button>
            <button
              style={styles.outlineDarkBtn}
              onClick={() => { setFinalizado(false); setActiveTab("atendimentos"); }}
            >
              <i className="fa-solid fa-rectangle-list" style={styles.buttonIcon} /> Serviços
            </button>
            <button style={styles.primaryBtn} onClick={gerarFichaPDF}>
              <i className="fa-solid fa-file-invoice" style={styles.buttonIcon} /> Gerar Ficha PDF
            </button>
            <button style={styles.primaryBtn} onClick={gerarTermoPDF}>
              <i className="fa-solid fa-file-lines" style={styles.buttonIcon} /> Gerar Termo PDF
            </button>
            <button style={styles.primaryBtn} onClick={gerarFichaTecnicaPDF}>
              <i className="fa-solid fa-file-medical" style={styles.buttonIcon} /> Ficha Técnica
            </button>
          </div>
        </div>
        <PdfPreviewModal
          pdfPreview={pdfPreview}
          onClose={closePdfPreview}
          onDownload={downloadPreviewPdf}
          onPrint={printPreviewPdf}
        />
      </div>
    );
  }

  if (bootLoading) {
    return (
      <div style={{ ...styles.loginPage, ...themeVars }}>
        <div style={styles.loginCard}>
          <div style={styles.loginBrandWrap}>
            <img src="/logosf.png" alt="Logo Grupo São Francisco" style={styles.loginLogo} />
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
            <img src="/logosf.png" alt="Logo Grupo São Francisco" style={styles.loginLogo} />
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
            <button style={styles.primaryBtn} type="submit">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  // --- Main shell ---
  return (
    <div className="app-shell" style={themeVars}>
      {activeTab === "home" && (
        <header className="home-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <img
              src="/logosf.png"
              alt="Logo Grupo São Francisco"
              style={{ width: 72, height: "auto", display: "block", objectFit: "contain", background: "transparent", boxShadow: "none", border: "none", padding: 0, margin: 0 }}
            />
            <div className="home-brand-copy" style={{ background: "transparent", boxShadow: "none", border: "none", padding: 0 }}>
              <div className="home-brand-title">GRUPO SÃO FRANCISCO</div>
              <div className="home-brand-subtitle">Assistência e cuidado em todos os momentos</div>
            </div>
          </div>
          <div className="home-actions">
            <div className="user-pill">
              <div className="user-pill-avatar">{getInitials(session?.name || "U")}</div>
              <div className="user-pill-copy">
                <span className="user-pill-label">{session?.name}</span>
                <span className="user-pill-sublabel">{getRoleUiLabel(session?.role)}</span>
              </div>
            </div>
            {normalizeRole(session?.role) === "ADM" && (
              <button className="home-utility-button" onClick={() => setActiveTab("config")} title="Configurações">
                <i className="fa-solid fa-gear" />
              </button>
            )}
            <button className="home-utility-button" onClick={() => setTheme(isDark ? "light" : "dark")} title={isDark ? "Claro" : "Escuro"}>
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
          <button style={activeTab === "home" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("home")}>Início</button>
          <button style={activeTab === "atendimento" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("atendimento")}>Novo Atendimento</button>
          <button style={activeTab === "atendimentos" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("atendimentos")}>Serviços</button>
          <button style={activeTab === "operacional" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("operacional")}>Gestão de Etapas</button>
          <button style={activeTab === "equipe" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("equipe")}>Equipe</button>
          {(normalizeRole(session?.role) === "ADM" || normalizeRole(session?.role) === "ATENDENTE") && (
            <button style={activeTab === "os" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("os")}>OS</button>
          )}
          {(normalizeRole(session?.role) === "ADM" || normalizeRole(session?.role) === "ATENDENTE") && (
            <button style={activeTab === "servicos_dia" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("servicos_dia")}>Serviços do Dia</button>
          )}
          {normalizeRole(session?.role) === "ADM" && (
            <button style={activeTab === "config" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("config")}>Configurações</button>
          )}
        </div>
      )}

      {activeTab === "home" && (
        <section className="home-screen">
          <div className="home-cards-grid">
            <button
              className="home-action-card"
              onClick={() => { resetAtendimento(); setFinalizado(false); setActiveTab("atendimento"); }}
            >
              <div className="home-action-icon"><i className="fa-solid fa-circle-plus" /></div>
              <div className="home-action-content">
                <div className="home-action-title">NOVO ATENDIMENTO</div>
                <div className="home-action-text">Iniciar novo atendimento</div>
              </div>
            </button>
            <button className="home-action-card" onClick={() => setActiveTab("atendimentos")}>
              <div className="home-action-icon"><i className="fa-solid fa-file-lines" /></div>
              <div className="home-action-content">
                <div className="home-action-title">SERVIÇOS</div>
                <div className="home-action-text">Consultar, editar e reabrir registros</div>
              </div>
            </button>
            <button className="home-action-card" onClick={() => setActiveTab("operacional")}>
              <div className="home-action-icon"><i className="fa-solid fa-diagram-project" /></div>
              <div className="home-action-content">
                <div className="home-action-title">GESTÃO DE ETAPAS</div>
                <div className="home-action-text">Acompanhar etapas e atendimentos em andamento</div>
              </div>
            </button>
          </div>
          <footer className="home-footer">
            © 2026 Caetano Digital System. All Rights Reserved.
          </footer>
        </section>
      )}

      {activeTab === "atendimentos" && (
        <ServicosTab
          atendimentos={atendimentos}
          openAttendance={openAttendance}
          onDelete={handleDeleteAttendance}
          toggleEquipeAcionada={toggleEquipeAcionada}
          onNewAtendimento={() => { resetAtendimento(); setFinalizado(false); setActiveTab("atendimento"); }}
        />
      )}

      {activeTab === "operacional" && (
        <OperacionalTab
          attendances={operationalAttendances}
          settings={settings}
          session={session}
          updateOperationalStage={updateOperationalStage}
          updateOperationalTransport={updateOperationalTransport}
          updateOperationalPerson={updateOperationalPerson}
        />
      )}

      {activeTab === "equipe" && (
        <Equipe
          atendimentos={atendimentosEquipe}
          updateOperationalStage={updateOperationalStage}
          formatDateBR={formatDateBR}
          ordensAtivas={ordensAtivas}
          atualizarStatusOs={atualizarStatusOs}
          servicosDoDia={servicosDoDia}
        />
      )}

      {activeTab === "servicos_dia" && (normalizeRole(session?.role) === "ADM" || normalizeRole(session?.role) === "ATENDENTE") && (
        <ServicosDoDia atendimentos={atendimentos} />
      )}

      {activeTab === "os" && (normalizeRole(session?.role) === "ADM" || normalizeRole(session?.role) === "ATENDENTE") && (
        <OrdemServicoTab
          ordens={ordens}
          criarOrdem={criarOrdem}
          atualizarStatus={atualizarStatusOs}
          cancelarOrdem={cancelarOrdem}
          onConverter={handleConvertOsToAtendimento}
          settings={settings}
        />
      )}

      {activeTab === "atendimento" && (
        <>
          {osConvertidaMensagem && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, marginBottom: 14, padding: "12px 16px", borderRadius: 14,
              background: "rgba(38,177,196,0.12)", border: "1px solid rgba(38,177,196,0.25)",
              color: "var(--brand-accent)", fontWeight: 700, fontSize: 14,
            }}>
              <span>✅ {osConvertidaMensagem}</span>
              <button
                onClick={() => setOsConvertidaMensagem("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand-accent)", fontSize: 16, lineHeight: 1 }}
              >✕</button>
            </div>
          )}
          <section style={styles.card}>
            <button type="button" style={styles.sectionToggle} onClick={() => toggleSection("atendimentoParte1")}>
              <span style={styles.cardTitle}>Parte 1 — Atendimento</span>
              <span style={styles.sectionToggleIcon}>{collapsedSections.atendimentoParte1 ? "＋" : "−"}</span>
            </button>

            {!collapsedSections.atendimentoParte1 && (
              <>
                <div style={styles.grid3}>
                  <div style={styles.fieldWide}>
                    <label style={styles.label}>Falecido</label>
                    <input style={styles.input} value={form.falecido} onChange={(e) => updateForm("falecido", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Sexo</label>
                    <select style={styles.input} value={form.sexo} onChange={(e) => updateForm("sexo", e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Data de nascimento</label>
                    <input type="date" style={styles.input} value={form.dataNascimento} onChange={(e) => updateForm("dataNascimento", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Peso (ex: 70kg)</label>
                    <input style={styles.input} value={form.peso} onChange={(e) => updateForm("peso", e.target.value)} placeholder="ex: 70kg" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Altura (ex: 1.75m)</label>
                    <input style={styles.input} value={form.altura} onChange={(e) => updateForm("altura", e.target.value)} placeholder="ex: 1.75m" />
                  </div>
                  <div style={styles.fieldWide}>
                    <label style={styles.label}>Local do óbito</label>
                    <select style={styles.input} value={form.localObito} onChange={(e) => updateForm("localObito", e.target.value)}>
                      <option value="">Selecione</option>
                      {settings.hospitals.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div style={styles.fieldWide}>
                    <label style={styles.label}>Cemitério</label>
                    <select style={styles.input} value={form.cemiterio} onChange={(e) => updateForm("cemiterio", e.target.value)}>
                      <option value="">Selecione</option>
                      {settings.cemeteries.map((item) => <option key={item} value={item}>{item}</option>)}
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
                        if (value !== "funeraria") { updateForm("velorioUnidade", ""); updateForm("velorioSala", ""); }
                        if (value !== "igreja") updateForm("velorioNomeLocal", "");
                        if (value !== "residencia" && value !== "igreja") {
                          updateForm("velorioCep", ""); updateForm("velorioEndereco", "");
                          updateForm("velorioNumero", ""); updateForm("velorioBairro", "");
                        }
                        if (value !== "viagem") { updateForm("cidadeDestino", ""); updateForm("embarque", ""); }
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
                        <select style={styles.input} value={form.velorioUnidade} onChange={(e) => { updateForm("velorioUnidade", e.target.value); updateForm("velorioSala", ""); }}>
                          <option value="">Selecione</option>
                          {Object.keys(FUNERAL_UNITS).map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Sala</label>
                        <select style={styles.input} value={form.velorioSala} onChange={(e) => updateForm("velorioSala", e.target.value)}>
                          <option value="">Selecione</option>
                          {(FUNERAL_UNITS[form.velorioUnidade] || []).map((room) => <option key={room} value={room}>{room}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {(form.velorioTipo === "residencia" || form.velorioTipo === "igreja") && (
                    <>
                      {form.velorioTipo === "igreja" && (
                        <div style={styles.fieldWide}>
                          <label style={styles.label}>Nome do local</label>
                          <input style={styles.input} value={form.velorioNomeLocal || ""} onChange={(e) => updateForm("velorioNomeLocal", e.target.value)} />
                        </div>
                      )}
                      <div style={styles.field}>
                        <label style={styles.label}>CEP</label>
                        <input style={styles.input} value={form.velorioCep} onChange={(e) => handleCepChange(e.target.value, "velorio")} placeholder="00000-000" />
                        {cepStatus.velorio.loading ? <span style={styles.helpText}>Consultando CEP...</span> : null}
                        {cepStatus.velorio.error ? <span style={styles.errorText}>{cepStatus.velorio.error}</span> : null}
                      </div>
                      <div style={styles.fieldWide}>
                        <label style={styles.label}>Endereço</label>
                        <input style={styles.input} value={form.velorioEndereco} onChange={(e) => updateForm("velorioEndereco", e.target.value)} />
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Número</label>
                        <input style={styles.input} value={form.velorioNumero} onChange={(e) => updateForm("velorioNumero", e.target.value)} />
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Bairro</label>
                        <input style={styles.input} value={form.velorioBairro} onChange={(e) => updateForm("velorioBairro", e.target.value)} />
                      </div>
                    </>
                  )}

                  {form.velorioTipo === "viagem" && (
                    <>
                      <div style={styles.fieldWide}>
                        <label style={styles.label}>Cidade de destino</label>
                        <input style={styles.input} value={form.cidadeDestino} onChange={(e) => updateForm("cidadeDestino", e.target.value)} />
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Local de embarque</label>
                        <select style={styles.input} value={form.embarque} onChange={(e) => updateForm("embarque", e.target.value)}>
                          <option value="">Selecione</option>
                          {settings.embarques.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  <div style={styles.field}>
                    <label style={styles.label}>Data/Falecimento</label>
                    <input type="date" style={styles.input} value={form.dataFalecimento} onChange={(e) => updateForm("dataFalecimento", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Hora/Falecimento</label>
                    <input type="time" style={styles.input} value={form.horaFalecimento} onChange={(e) => updateForm("horaFalecimento", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Data/Saída</label>
                    <input type="date" style={styles.input} value={form.dataSaida} onChange={(e) => updateForm("dataSaida", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Hora/Saída</label>
                    <input type="time" style={styles.input} value={form.horaSaida} onChange={(e) => updateForm("horaSaida", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Hora do Atendimento</label>
                    <input type="time" style={styles.input} value={form.horaAtendimento} onChange={(e) => updateForm("horaAtendimento", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Data do Atendimento</label>
                    <input type="date" style={styles.input} value={form.dataAtendimento} onChange={(e) => updateForm("dataAtendimento", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Chegou na clínica às</label>
                    <input type="time" style={styles.input} value={form.chegouClinica} onChange={(e) => updateForm("chegouClinica", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Início às</label>
                    <input type="time" style={styles.input} value={form.inicioAs} onChange={(e) => updateForm("inicioAs", e.target.value)} />
                  </div>
                </div>

                <div style={styles.separator} />

                <div style={styles.field}>
                  <label style={styles.label}>Tipo de serviço</label>
                  <select style={styles.input} value={form.tipoPlano} onChange={(e) => updateForm("tipoPlano", e.target.value)}>
                    {SERVICE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {["socio_especial", "socio_luxo", "socio_premium"].includes(form.tipoPlano) && (
                  <div style={styles.grid3}>
                    <div style={styles.field}>
                      <label style={styles.label}>Plano</label>
                      <input style={styles.input} value={form.plano} onChange={(e) => updateForm("plano", e.target.value)} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Código</label>
                      <input style={styles.input} value={form.codigo} onChange={(e) => updateForm("codigo", e.target.value)} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Dependente</label>
                      <input style={styles.input} value={form.dependente} onChange={(e) => updateForm("dependente", e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section style={styles.card}>
            <button type="button" style={styles.sectionToggle} onClick={() => toggleSection("atendimentoParte2")}>
              <span style={styles.cardTitle}>Parte 2 — Serviços</span>
              <span style={styles.sectionToggleIcon}>{collapsedSections.atendimentoParte2 ? "＋" : "−"}</span>
            </button>
            {!collapsedSections.atendimentoParte2 && (
              <>
                <div style={styles.infoRow}>
                  <div style={styles.infoPill}>{selectedCount} serviço(s) selecionado(s)</div>
                  <div style={styles.infoPill}>Total: R$ {formatMoney(totalValue)}</div>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <button style={styles.primaryBtn} onClick={() => setShowServicesModal(true)}>
                    Selecionar Serviços
                  </button>
                </div>
              </>
            )}
          </section>

          <section style={styles.card}>
            <button type="button" style={styles.sectionToggle} onClick={() => toggleSection("atendimentoParte3")}>
              <span style={styles.cardTitle}>Parte 3 — Dados do Responsável</span>
              <span style={styles.sectionToggleIcon}>{collapsedSections.atendimentoParte3 ? "＋" : "−"}</span>
            </button>
            {!collapsedSections.atendimentoParte3 && (
              <div style={styles.grid3}>
                <div style={styles.fieldWide}>
                  <label style={styles.label}>Nome</label>
                  <input style={styles.input} value={form.responsavelNome} onChange={(e) => updateForm("responsavelNome", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>RG</label>
                  <input style={styles.input} value={form.responsavelRg} onChange={(e) => updateForm("responsavelRg", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>CPF</label>
                  <input style={styles.input} value={form.responsavelCpf} onChange={(e) => updateForm("responsavelCpf", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>CEP</label>
                  <input style={styles.input} value={form.responsavelCep} onChange={(e) => handleCepChange(e.target.value, "responsavel")} />
                  {cepStatus.responsavel.loading && <span style={styles.helpText}>Buscando CEP...</span>}
                  {cepStatus.responsavel.error && <span style={styles.errorText}>{cepStatus.responsavel.error}</span>}
                </div>
                <div style={styles.fieldWide}>
                  <label style={styles.label}>Endereço</label>
                  <input style={styles.input} value={form.responsavelEndereco} onChange={(e) => updateForm("responsavelEndereco", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Número</label>
                  <input style={styles.input} value={form.responsavelNumero} onChange={(e) => updateForm("responsavelNumero", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Bairro</label>
                  <input style={styles.input} value={form.responsavelBairro} onChange={(e) => updateForm("responsavelBairro", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Celular 1</label>
                  <input style={styles.input} value={form.responsavelCelular1} onChange={(e) => updateForm("responsavelCelular1", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Celular 2</label>
                  <input style={styles.input} value={form.responsavelCelular2} onChange={(e) => updateForm("responsavelCelular2", e.target.value)} />
                </div>
              </div>
            )}
          </section>

          <section style={styles.card}>
            <button type="button" style={styles.sectionToggle} onClick={() => toggleSection("atendimentoParte4")}>
              <span style={styles.cardTitle}>Parte 4 — Termo de Autorização</span>
              <span style={styles.sectionToggleIcon}>{collapsedSections.atendimentoParte4 ? "＋" : "−"}</span>
            </button>
            {!collapsedSections.atendimentoParte4 && (
              <>
                <div style={styles.grid3}>
                  <div style={styles.field}>
                    <label style={styles.label}>Parentesco</label>
                    <input style={styles.input} value={form.parentesco} onChange={(e) => updateForm("parentesco", e.target.value)} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Tempo de velório</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input style={styles.input} value={form.tempoVelorioValor} onChange={(e) => updateForm("tempoVelorioValor", e.target.value)} />
                      <select style={styles.input} value={form.tempoVelorioUnidade} onChange={(e) => updateForm("tempoVelorioUnidade", e.target.value)}>
                        <option value="horas">Horas</option>
                        <option value="dias">Dias</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Horário</label>
                    <input type="time" style={styles.input} value={form.horarioVelorio} onChange={(e) => updateForm("horarioVelorio", e.target.value)} />
                  </div>
                </div>

                <div style={styles.grid3}>
                  <div style={styles.field}>
                    <label style={styles.label}>Roupa entregue para</label>
                    <select style={styles.input} value={form.roupaEntreguePara} onChange={(e) => updateForm("roupaEntreguePara", e.target.value)}>
                      <option value="motorista">Motorista</option>
                      <option value="recepção">Recepção</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Religião</label>
                    <select style={styles.input} value={form.religiao} onChange={(e) => updateForm("religiao", e.target.value)}>
                      <option value="católico">Católico</option>
                      <option value="evangélico">Evangélico</option>
                      <option value="espírita">Espírita</option>
                      <option value="sem religião">Sem religião</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Técnico</label>
                    <select style={styles.input} value={form.tecnico} onChange={(e) => updateForm("tecnico", e.target.value)}>
                      <option value="">Selecione</option>
                      {(settings.technicians || []).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={styles.separator} />
                <h3 style={{ color: "#0B7285" }}>Do Corpo</h3>

                <div style={styles.grid3}>
                  <div style={styles.field}>
                    <label style={styles.label}>Condições</label>
                    <select style={styles.input} value={form.necropsia} onChange={(e) => updateForm("necropsia", e.target.value)}>
                      <option value="nao">Não necropsiado</option>
                      <option value="sim">Necropsiado</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Chegou vestido</label>
                    <select style={styles.input} value={form.veioVestido} onChange={(e) => { updateForm("veioVestido", e.target.value); if (e.target.value !== "sim") updateForm("roupaDestino", ""); }}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Retirar esmalte</label>
                    <select style={styles.input} value={form.retirarEsmalte} onChange={(e) => updateForm("retirarEsmalte", e.target.value)}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>

                {form.veioVestido === "sim" && (
                  <div style={styles.field}>
                    <label style={styles.label}>Roupa: devolver ou descartar</label>
                    <select style={styles.input} value={form.roupaDestino} onChange={(e) => updateForm("roupaDestino", e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="devolver">Devolver</option>
                      <option value="descartar">Descartar</option>
                    </select>
                  </div>
                )}

                <div style={styles.separator} />
                <h3 style={{ color: "#0B7285" }}>Da Estética</h3>

                <div style={styles.grid3}>
                  <div style={styles.field}>
                    <label style={styles.label}>Barbear</label>
                    <select style={styles.input} value={form.barbear} onChange={(e) => updateForm("barbear", e.target.value)}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Bigode</label>
                    <select style={styles.input} value={form.bigode} onChange={(e) => updateForm("bigode", e.target.value)}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Cavanhaque</label>
                    <select style={styles.input} value={form.cavanhaque} onChange={(e) => updateForm("cavanhaque", e.target.value)}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>

                <div style={styles.grid3}>
                  <div style={styles.field}>
                    <label style={styles.label}>Maquiagem</label>
                    <select style={styles.input} value={form.maquiagem} onChange={(e) => { updateForm("maquiagem", e.target.value); if (e.target.value !== "sim") updateForm("maquiagemTipo", ""); }}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                  {form.maquiagem === "sim" && (
                    <div style={styles.field}>
                      <label style={styles.label}>Tipo de maquiagem</label>
                      <select style={styles.input} value={form.maquiagemTipo} onChange={(e) => updateForm("maquiagemTipo", e.target.value)}>
                        <option value="leve">Leve</option>
                        <option value="natural">Natural</option>
                        <option value="forte">Forte</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={styles.separator} />
                <h3 style={{ color: "#0B7285" }}>Ornato e Adorno</h3>

                <div style={styles.grid3}>
                  <div style={styles.field}>
                    <label style={styles.label}>Ornamentação com flores</label>
                    <select style={styles.input} value={form.ornamentacao} onChange={(e) => { updateForm("ornamentacao", e.target.value); if (e.target.value !== "sim") updateForm("tipoFlor", ""); }}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                  {form.ornamentacao === "sim" && (
                    <div style={styles.field}>
                      <label style={styles.label}>Flores</label>
                      <select style={styles.input} value={form.tipoFlor} onChange={(e) => updateForm("tipoFlor", e.target.value)}>
                        <option value="">Selecione</option>
                        <option value="naturais">Naturais</option>
                        <option value="artificiais">Artificiais</option>
                      </select>
                    </div>
                  )}
                  <div style={styles.field}>
                    <label style={styles.label}>Joias</label>
                    <select style={styles.input} value={form.joias} onChange={(e) => { updateForm("joias", e.target.value); if (e.target.value !== "sim") updateForm("joiasQuais", ""); }}>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>

                {form.joias === "sim" && (
                  <div style={styles.field}>
                    <label style={styles.label}>Quais joias</label>
                    <input style={styles.input} value={form.joiasQuais} onChange={(e) => updateForm("joiasQuais", e.target.value)} />
                  </div>
                )}

                <div style={styles.separator} />
                <h3 style={{ color: "#0B7285" }}>Geral</h3>

                <div style={styles.grid3}>
                  <div style={styles.field}>
                    <label style={styles.label}>Modelo da urna</label>
                    <select style={styles.input} value={form.modeloUrna} onChange={(e) => { updateForm("modeloUrna", e.target.value); if (e.target.value !== "luxo") updateForm("refUrna", ""); }}>
                      <option value="0X">0X</option>
                      <option value="plano">Plano</option>
                      <option value="luxo">Luxo</option>
                    </select>
                  </div>
                  {form.modeloUrna === "luxo" && (
                    <div style={styles.field}>
                      <label style={styles.label}>REF:</label>
                      <input style={styles.input} value={form.refUrna} onChange={(e) => updateForm("refUrna", e.target.value)} />
                    </div>
                  )}
                  <div style={styles.field}>
                    <label style={styles.label}>Cor da urna</label>
                    <select style={styles.input} value={form.corUrna} onChange={(e) => updateForm("corUrna", e.target.value)}>
                      <option value="">Selecione</option>
                      {(settings.coffinColors || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Atendente</label>
                    <select style={styles.input} value={form.atendenteGeral} onChange={(e) => updateForm("atendenteGeral", e.target.value)}>
                      <option value="">Selecione</option>
                      {(settings.attendants || []).map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Motorista</label>
                    <select style={styles.input} value={form.motorista} onChange={(e) => updateForm("motorista", e.target.value)}>
                      <option value="">Selecione</option>
                      {(settings.drivers || []).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Carro</label>
                    <select style={styles.input} value={form.carroGeral} onChange={(e) => updateForm("carroGeral", e.target.value)}>
                      <option value="">Selecione</option>
                      {(settings.cars || []).map((car) => <option key={car} value={car}>{car}</option>)}
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

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                  <button style={styles.primaryBtn} onClick={() => finalizarAtendimento(form, services, totalValue)}>
                    Finalizar Atendimento
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {activeTab === "config" && normalizeRole(session.role) === "ADM" && (
        <ConfigTab
          users={users}
          settings={settings}
          addUser={addUser}
          removeUser={removeUser}
          addSettingItem={addSettingItem}
          removeSettingItem={removeSettingItem}
        />
      )}

      {showServicesModal && (
        <ServicosModal
          services={services}
          toggleService={toggleService}
          updateService={updateService}
          isDark={isDark}
          onClose={() => setShowServicesModal(false)}
        />
      )}

      <PdfPreviewModal
        pdfPreview={pdfPreview}
        onClose={closePdfPreview}
        onDownload={downloadPreviewPdf}
        onPrint={printPreviewPdf}
      />
    </div>
  );
}
