import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { normalizeRole, getRoleUiLabel, getInitials } from "../utils/attendance";
import { useAgora } from "../hooks/useAgora";

// Menu lateral do sistema (no celular vira um menu que abre pelo botão ☰)

const FUSO = "America/Manaus";
const TODOS = ["ADM", "ATENDENTE", "SUPERVISOR"];

export const MENU_GRUPOS = [
  {
    titulo: "",
    itens: [
      { tab: "home", label: "Início", icone: "fa-solid fa-house" },
      { acao: "novo_aviso", label: "Novo aviso", icone: "fa-solid fa-bullhorn" },
    ],
  },
  {
    titulo: "Atendimento",
    itens: [
      { tab: "atendimento", label: "Novo atendimento", icone: "fa-solid fa-circle-plus" },
      { tab: "atendimentos", label: "Serviços", icone: "fa-solid fa-file-lines" },
      { tab: "servicos_dia", label: "Serviços do dia", icone: "fa-solid fa-calendar-day" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { tab: "operacional", label: "Gestão de etapas", icone: "fa-solid fa-diagram-project" },
      { tab: "equipe", label: "Equipe", icone: "fa-solid fa-people-group" },
      { tab: "os", label: "OS", icone: "fa-solid fa-clipboard-list" },
      { tab: "saidas", label: "Saídas", icone: "fa-solid fa-car-side", contador: "saidas" },
      { tab: "frota", label: "Frota", icone: "fa-solid fa-truck" },
    ],
  },
  {
    titulo: "Relacionamento",
    itens: [
      { tab: "interessados", label: "Interessados", icone: "fa-solid fa-user-plus", contador: "interessados" },
      { tab: "avaliacoes", label: "Avaliações", icone: "fa-solid fa-star" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { tab: "relatorios", label: "Relatórios", icone: "fa-solid fa-chart-column" },
      { tab: "config", label: "Configurações", icone: "fa-solid fa-gear" },
    ],
  },
];

// Quem pode abrir cada tela (as que não estão aqui, todos podem)
const PERMISSOES = {
  saidas: TODOS,
  interessados: TODOS,
  os: TODOS,
  servicos_dia: TODOS,
  relatorios: ["ADM"],
  avaliacoes: ["ADM", "SUPERVISOR"],
  config: ["ADM"],
};

export function podeAcessar(tab, role) {
  const lista = PERMISSOES[tab];
  return !lista || lista.includes(normalizeRole(role));
}

export function nomeDaTela(tab) {
  for (const g of MENU_GRUPOS) {
    const item = g.itens.find((i) => i.tab === tab);
    if (item) return item.label;
  }
  return "esta tela";
}

export function AcessoRestrito({ tab, role, onVoltar }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: "10vh" }}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 18, padding: "32px 28px", maxWidth: 420, textAlign: "center" }}>
        <i className="fa-solid fa-lock" style={{ fontSize: 30, color: "var(--text-muted)" }} aria-hidden="true" />
        <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text-main)", margin: "12px 0 6px" }}>Acesso restrito</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 18 }}>
          Seu perfil ({getRoleUiLabel(role)}) não tem permissão para acessar {nomeDaTela(tab)}. Fale com o administrador.
        </div>
        <button
          type="button"
          onClick={onVoltar}
          style={{ minHeight: 42, padding: "0 18px", borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--card-bg-alt)", color: "var(--text-main)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}

function lerRecolhido() {
  try { return localStorage.getItem("sf_menu_recolhido") === "1"; } catch { return false; }
}

export function MenuLateral({ activeTab, onNavegar, onAcao, session, saidasAbertas = 0, isDark, onTema, onSenha, onSair }) {
  const agora = useAgora(15000);
  const [aberto, setAberto] = useState(false);
  const [recolhido, setRecolhido] = useState(lerRecolhido);
  const [interessadosPendentes, setInteressadosPendentes] = useState(0);
  const role = session?.role;

  // Contador de interessados esperando contato
  useEffect(() => {
    if (!podeAcessar("interessados", role)) return undefined;
    let vivo = true;
    async function contar() {
      const { count } = await supabase.from("interessados").select("id", { count: "exact", head: true }).eq("atendido", false);
      if (vivo) setInteressadosPendentes(count || 0);
    }
    contar();
    const t = setInterval(contar, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [role]);

  useEffect(() => {
    try { localStorage.setItem("sf_menu_recolhido", recolhido ? "1" : "0"); } catch { /* ignora */ }
  }, [recolhido]);

  const hora = new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
  const data = new Date(agora).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long", timeZone: FUSO }).replace(".", "");
  const contadores = { saidas: saidasAbertas, interessados: interessadosPendentes };

  function ir(item) {
    if (item.acao) onAcao?.(item.acao);
    else onNavegar(item.tab);
    setAberto(false);
  }

  return (
    <>
      {/* Barra do topo (só no celular) */}
      <div className="menu-topo">
        <button type="button" className="menu-topo-botao" aria-label="Abrir menu" onClick={() => setAberto(true)}>
          <i className="fa-solid fa-bars" />
        </button>
        <span className="menu-topo-titulo">{nomeDaTela(activeTab)}</span>
        <span className="menu-topo-hora">{hora}</span>
      </div>
      {aberto && <div className="menu-fundo" onClick={() => setAberto(false)} aria-hidden="true" />}

      <nav className={`menu-lateral${aberto ? " menu-lateral--aberto" : ""}${recolhido ? " menu-lateral--recolhido" : ""}`} aria-label="Menu principal">
        <div className="menu-marca">
          <img src="/logosf.png" alt="" className="menu-marca-logo" />
          <div className="menu-texto">
            <div className="menu-marca-titulo">Grupo São Francisco</div>
            <div className="menu-marca-sub">Sistema funerário</div>
          </div>
          <button type="button" className="menu-recolher" aria-label={recolhido ? "Expandir menu" : "Recolher menu"} title={recolhido ? "Expandir menu" : "Recolher menu"} onClick={() => setRecolhido((r) => !r)}>
            <i className={`fa-solid fa-angles-${recolhido ? "right" : "left"}`} />
          </button>
        </div>

        <div className="menu-relogio" title={data}>
          <div className="menu-relogio-hora">{hora}</div>
          <div className="menu-relogio-data menu-texto">{data}</div>
        </div>

        <div className="menu-itens">
          {MENU_GRUPOS.map((grupo) => (
            <div key={grupo.titulo || "inicio"} className="menu-grupo">
              {grupo.titulo && <div className="menu-grupo-titulo menu-texto">{grupo.titulo}</div>}
              {grupo.itens.map((item) => {
                const liberado = item.acao ? true : podeAcessar(item.tab, role);
                const ativoAgora = !item.acao && activeTab === item.tab;
                const n = item.contador ? contadores[item.contador] : 0;
                return (
                  <button
                    key={item.tab || item.acao}
                    type="button"
                    className={`menu-item${ativoAgora ? " menu-item--ativo" : ""}${liberado ? "" : " menu-item--bloqueado"}`}
                    onClick={() => ir(item)}
                    title={recolhido ? item.label : undefined}
                    aria-current={ativoAgora ? "page" : undefined}
                  >
                    <i className={`${item.icone} menu-item-icone`} aria-hidden="true" />
                    <span className="menu-texto">{item.label}</span>
                    {!liberado && <i className="fa-solid fa-lock menu-item-cadeado" aria-label="sem acesso" />}
                    {liberado && n > 0 && <span className={`menu-contador menu-contador--${item.contador}`}>{n}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="menu-usuario">
          <div className="menu-usuario-avatar">{getInitials(session?.name || "U")}</div>
          <div className="menu-texto" style={{ minWidth: 0, flex: 1 }}>
            <div className="menu-usuario-nome">{session?.name}</div>
            <div className="menu-usuario-perfil">{getRoleUiLabel(role)}</div>
          </div>
          <div className="menu-usuario-acoes">
            <button type="button" onClick={onSenha} title="Alterar senha" aria-label="Alterar senha"><i className="fa-solid fa-key" /></button>
            <button type="button" onClick={onTema} title={isDark ? "Tema claro" : "Tema escuro"} aria-label="Trocar tema"><i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"}`} /></button>
            <button type="button" onClick={onSair} title="Sair" aria-label="Sair"><i className="fa-solid fa-right-from-bracket" /></button>
          </div>
        </div>
      </nav>
    </>
  );
}
