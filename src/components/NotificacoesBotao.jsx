import React, { useEffect, useState } from "react";
import { ativarNotificacoes, getEstadoNotificacoes, sincronizarInscricao } from "../utils/push";

const caixa = (cor, fundo) => ({
  border: `1px solid ${cor}`, background: fundo, borderRadius: 14, padding: "12px 14px",
  marginBottom: 12, display: "flex", flexDirection: "column", gap: 8,
});

// Botão "Ativar notificações" do Painel da Equipe, com instruções para iPhone
export function NotificacoesBotao({ session }) {
  const [estado, setEstado] = useState("carregando");
  const [erro, setErro] = useState("");
  const [ativando, setAtivando] = useState(false);
  const [mostrarPassos, setMostrarPassos] = useState(false);

  useEffect(() => {
    let vivo = true;
    getEstadoNotificacoes().then((e) => {
      if (!vivo) return;
      setEstado(e);
      if (e === "ativo") sincronizarInscricao(session);
    });
    return () => { vivo = false; };
  }, [session]);

  async function ativar() {
    setErro("");
    setAtivando(true);
    try {
      await ativarNotificacoes(session);
      setEstado("ativo");
    } catch (e) {
      setErro(e.message || "Não foi possível ativar.");
      setEstado(await getEstadoNotificacoes());
    }
    setAtivando(false);
  }

  if (estado === "carregando" || estado === "ativo" || estado === "sem_chave") return null;

  if (estado === "iphone_instalar") {
    return (
      <div style={caixa("var(--brand-accent)", "var(--info-pill-bg)")}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
          <i className="fa-solid fa-bell" style={{ marginRight: 8 }} />Receber avisos no iPhone
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          No iPhone, os avisos só funcionam com o sistema na tela de início.
        </div>
        {!mostrarPassos ? (
          <button type="button" onClick={() => setMostrarPassos(true)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--brand-accent)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Ver como fazer
          </button>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-main)", lineHeight: 1.6 }}>
            <li>Abra este site no <strong>Safari</strong>.</li>
            <li>Toque em <strong>Compartilhar</strong> <i className="fa-solid fa-arrow-up-from-bracket" /> (barra de baixo).</li>
            <li>Escolha <strong>“Adicionar à Tela de Início”</strong> e confirme.</li>
            <li>Abra o sistema pelo ícone <strong>Grupo SF</strong> na tela de início, faça login e toque em <strong>“Ativar notificações”</strong>.</li>
          </ol>
        )}
      </div>
    );
  }

  if (estado === "sem_suporte") {
    return (
      <div style={caixa("var(--border-soft)", "var(--card-bg-soft)")}>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Este navegador não recebe notificações. No Android, use o <strong>Chrome</strong>.
        </div>
      </div>
    );
  }

  if (estado === "bloqueado") {
    return (
      <div style={caixa("rgba(239,68,68,0.4)", "rgba(239,68,68,0.08)")}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c" }}>Notificações bloqueadas</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Toque no cadeado ao lado do endereço do site → <strong>Permissões</strong> → <strong>Notificações</strong> → Permitir. Depois recarregue a página.
        </div>
      </div>
    );
  }

  // inativo
  return (
    <div style={caixa("var(--brand-accent)", "var(--info-pill-bg)")}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
        <i className="fa-solid fa-bell" style={{ marginRight: 8 }} />Receba avisos de saídas no celular
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        Novos serviços e lembretes 30 minutos antes, mesmo com o sistema fechado.
      </div>
      {erro && <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{erro}</div>}
      <button
        type="button"
        onClick={ativar}
        disabled={ativando}
        style={{ minHeight: 46, border: "none", borderRadius: 12, background: "var(--brand-accent)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: ativando ? 0.6 : 1 }}
      >
        {ativando ? "Ativando..." : "Ativar notificações"}
      </button>
    </div>
  );
}
