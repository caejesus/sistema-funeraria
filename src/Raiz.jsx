import React, { useEffect, useState } from "react";
import App from "./App.jsx";
import LoginTela from "./LoginTela.jsx";
import AcompanhamentoPublico from "./AcompanhamentoPublico.jsx";
import ConvitePublico from "./ConvitePublico.jsx";
import MensagensPublico from "./MensagensPublico.jsx";
import { supabase } from "./lib/supabaseClient";
import { colaboradorLogado, limparDadosLocais, sair } from "./lib/auth";

// Porta de entrada do site:
//  - páginas públicas (família / convidados) abrem sem login;
//  - o resto só abre depois do login pelo Supabase Auth.

function rotaPublica() {
  const caminho = typeof window !== "undefined" ? window.location.pathname : "";
  const acompanhamento = caminho.match(/^\/acompanhamento\/([^/]+)/)?.[1];
  if (acompanhamento) return <AcompanhamentoPublico trackingId={acompanhamento} />;
  const convite = caminho.match(/^\/convite\/([^/]+)/)?.[1];
  if (convite) return <ConvitePublico token={convite} />;
  const mensagens = caminho.match(/^\/mensagens\/([^/]+)/)?.[1];
  if (mensagens) return <MensagensPublico token={mensagens} />;
  return null;
}

function Carregando() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f7f6" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, textAlign: "center", border: "1px solid #e5ecea", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", maxWidth: 320, width: "90%" }}>
        <img src="/logosf.png" alt="Grupo São Francisco" style={{ width: 180, display: "block", margin: "0 auto 20px", objectFit: "contain" }} />
        <div style={{ fontSize: 24, fontWeight: 700, color: "#333", marginBottom: 8 }}>Sistema Funerário</div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Carregando...</div>
      </div>
    </div>
  );
}

export default function Raiz() {
  const publica = rotaPublica();
  const [carregando, setCarregando] = useState(!publica);
  const [colaborador, setColaborador] = useState(null);

  useEffect(() => {
    if (publica) return undefined;
    let vivo = true;
    limparDadosLocais(); // apaga cópias antigas de senhas/atendimentos guardadas no navegador
    colaboradorLogado().then((c) => {
      if (!vivo) return;
      setColaborador(c);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") setColaborador(null);
    });
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (publica) return publica;
  if (carregando) return <Carregando />;

  if (!colaborador) {
    return (
      <LoginTela
        onEntrou={async () => {
          const c = await colaboradorLogado();
          if (!c) {
            await sair();
            return "Seu acesso não está ligado a nenhum colaborador. Fale com o administrador.";
          }
          setColaborador(c);
          return "";
        }}
      />
    );
  }

  return <App key={colaborador.id} colaborador={colaborador} />;
}
