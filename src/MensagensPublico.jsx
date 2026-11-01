import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

// Página da família com as mensagens do convite — protegida por código de acesso

const C = {
  fundo: "#f4f2ee",
  card: "#ffffff",
  texto: "#1f2a2e",
  suave: "#5b6a6f",
  linha: "#e4e0d8",
  acento: "#0f7f8c",
};

function linkContato(c) {
  const v = String(c || "").trim();
  if (v.includes("@")) return `mailto:${v}`;
  const dig = v.replace(/\D/g, "");
  if (dig.length >= 10) return `https://wa.me/${dig.length <= 11 ? "55" + dig : dig}`;
  return "";
}

export default function MensagensPublico({ token }) {
  const chave = `msg_codigo_${token}`;
  const [codigo, setCodigo] = useState(() => {
    try { return sessionStorage.getItem(chave) || ""; } catch { return ""; }
  });
  const [mensagens, setMensagens] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [falecido, setFalecido] = useState("");

  async function buscar(cod) {
    setCarregando(true);
    setErro("");
    const { data, error } = await supabase.rpc("mensagens_do_convite", { p_token: token, p_codigo: cod });
    setCarregando(false);
    if (error) {
      console.error("Erro ao buscar mensagens:", error);
      setErro("Não foi possível carregar agora. Tente novamente.");
      return;
    }
    if (!data || data.ok === false) {
      setErro("Código de acesso incorreto.");
      try { sessionStorage.removeItem(chave); } catch { /* ignora */ }
      return;
    }
    try { sessionStorage.setItem(chave, cod); } catch { /* ignora */ }
    setFalecido(data.falecido || "");
    if (data.falecido) document.title = `Mensagens - ${data.falecido}`;
    setMensagens(data.mensagens || []);
  }

  useEffect(() => {
    if (codigo) buscar(codigo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pagina = { minHeight: "100vh", background: C.fundo, color: C.texto, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: "24px 16px 40px", boxSizing: "border-box" };
  const coluna = { maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 };
  const cartao = { background: C.card, border: `1px solid ${C.linha}`, borderRadius: 16, padding: 18 };

  return (
    <div style={pagina}>
      <main style={coluna}>
        <img src="/logogrupo.png" alt="Grupo São Francisco" style={{ width: 100, height: "auto", display: "block", margin: "0 auto" }} />

        {mensagens === null ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) buscar(codigo.trim()); }}
            style={{ ...cartao, display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
          >
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Mensagens de carinho</h1>
            <p style={{ margin: 0, fontSize: 14, color: C.suave, lineHeight: 1.5 }}>
              Digite o código de acesso que a funerária enviou para a família.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.suave }}>
              Código de acesso
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                style={{ border: `1px solid ${C.linha}`, borderRadius: 12, padding: "12px 14px", fontSize: 22, letterSpacing: 6, textAlign: "center", color: C.texto, fontFamily: "inherit" }}
              />
            </label>
            {erro && <div style={{ fontSize: 13, color: "#b91c1c" }}>{erro}</div>}
            <button type="submit" disabled={carregando || codigo.length < 6} style={{ minHeight: 48, border: "none", borderRadius: 12, background: C.acento, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: carregando || codigo.length < 6 ? 0.6 : 1 }}>
              {carregando ? "Verificando..." : "Ver mensagens"}
            </button>
          </form>
        ) : (
          <>
            <header style={{ textAlign: "center", padding: "6px 8px 0" }}>
              <div style={{ fontSize: 13, letterSpacing: 2, color: C.suave, textTransform: "uppercase", marginBottom: 6 }}>Mensagens de carinho</div>
              <h1 style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, lineHeight: 1.2 }}>{falecido}</h1>
              <div style={{ marginTop: 8, fontSize: 14, color: C.suave }}>
                {mensagens.length === 0 ? "Nenhuma mensagem até agora." : `${mensagens.length} mensage${mensagens.length === 1 ? "m" : "ns"}`}
              </div>
            </header>

            {mensagens.map((m) => {
              const link = linkContato(m.contato);
              return (
                <article key={m.id} style={{ ...cartao, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 16, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.mensagem}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {m.nome}{m.relacao ? <span style={{ fontWeight: 400, color: C.suave }}> · {m.relacao}</span> : null}
                  </div>
                  {m.contato && (
                    link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 12px", borderRadius: 10, border: `1px solid ${C.linha}`, color: C.acento, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                        <i className={m.contato.includes("@") ? "fa-regular fa-envelope" : "fa-brands fa-whatsapp"} aria-hidden="true" />{m.contato}
                      </a>
                    ) : (
                      <div style={{ fontSize: 14, color: C.suave }}>{m.contato}</div>
                    )
                  )}
                  <div style={{ fontSize: 12, color: C.suave }}>
                    {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </article>
              );
            })}

            <button type="button" onClick={() => buscar(codigo)} style={{ alignSelf: "center", minHeight: 44, padding: "0 18px", borderRadius: 999, border: `1px solid ${C.linha}`, background: C.card, color: C.texto, fontSize: 14, cursor: "pointer" }}>
              <i className="fa-solid fa-rotate-right" style={{ marginRight: 8 }} aria-hidden="true" />Atualizar
            </button>
          </>
        )}

        <footer style={{ textAlign: "center", fontSize: 12, color: C.suave, paddingTop: 6 }}>
          Grupo São Francisco · Assistência e cuidado em todos os momentos
        </footer>
      </main>
    </div>
  );
}
