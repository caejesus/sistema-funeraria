import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { CONTATOS_UNIDADES, INSTAGRAM_GRUPO, RELACOES_CONVITE, CEMITERIOS_MAPS, SERVICOS_CONVITE } from "./constants/unidadesAtendimento.js";

// Página pública do convite (aberta pelo QR Code do comunicado)
// Mostra velório, sepultamento e a mensagem da família, e recebe mensagens de condolências.

const ENDERECOS_UNIDADES = {
  "Unidade Cachoeirinha": "Avenida Carvalho Leal, 1000 - Cachoeirinha, Manaus - AM, 69065-000",
  "Unidade Santo Antônio": "Rua José Tadros, 1093 - Santo Antônio, Manaus - AM, 69029-510",
  "Unidade Cidade Nova": "Rua Professor Félix Valois, 15 - Cidade Nova, Manaus - AM, 69095-010",
};

const C = {
  fundo: "#f4f2ee",
  card: "#ffffff",
  texto: "#1f2a2e",
  suave: "#5b6a6f",
  linha: "#e4e0d8",
  acento: "#0f7f8c",
};

function dataBR(iso) {
  if (!iso) return "";
  const [a, m, d] = String(iso).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(iso);
}

function mapsUrl(destino) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
}

function Bloco({ icone, titulo, children }) {
  return (
    <section style={{ background: C.card, border: `1px solid ${C.linha}`, borderRadius: 16, padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.acento, textTransform: "uppercase" }}>
        <i className={icone} aria-hidden="true" />{titulo}
      </div>
      {children}
    </section>
  );
}

function BotaoMapa({ destino }) {
  if (!destino) return null;
  return (
    <a
      href={mapsUrl(destino)}
      target="_blank"
      rel="noopener noreferrer"
      style={{ alignSelf: "flex-start", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 12, background: C.acento, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
    >
      <i className="fa-solid fa-location-dot" aria-hidden="true" />Como chegar
    </a>
  );
}

function primeiroNome(nome) {
  const p = String(nome || "").trim().split(/\s+/)[0] || "";
  return p ? p.charAt(0) + p.slice(1).toLowerCase() : "";
}

function FormMensagem({ recordId, token, falecido, nome, setNome }) {
  const [contato, setContato] = useState("");
  const [relacao, setRelacao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e) {
    e.preventDefault();
    if (!nome.trim() || !contato.trim() || !mensagem.trim()) return setErro("Preencha seu nome, um contato e a mensagem.");
    setEnviando(true);
    setErro("");
    const { error } = await supabase.from("convite_mensagens").insert([
      {
        atendimento_id: String(recordId),
        convite_token: token,
        nome: nome.trim().slice(0, 120),
        contato: contato.trim().slice(0, 60),
        relacao: relacao.slice(0, 60),
        mensagem: mensagem.trim().slice(0, 2000),
      },
    ]);
    setEnviando(false);
    if (error) {
      console.error("Erro ao enviar mensagem:", error);
      return setErro("Não foi possível enviar agora. Tente novamente.");
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Bloco icone="fa-solid fa-heart" titulo="Mensagem enviada">
        <p style={{ margin: 0, fontSize: 15, color: C.texto, lineHeight: 1.5 }}>
          Obrigado pelo carinho. Sua mensagem será entregue à família.
        </p>
      </Bloco>
    );
  }

  const campo = { width: "100%", boxSizing: "border-box", border: `1px solid ${C.linha}`, borderRadius: 12, padding: "12px 14px", fontSize: 16, color: C.texto, background: "#fff", fontFamily: "inherit" };

  return (
    <Bloco icone="fa-regular fa-comment" titulo="Deixe uma mensagem para a família">
      <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.suave }}>
          Seu nome
          <input style={campo} value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.suave }}>
          Telefone ou e-mail
          <input style={campo} value={contato} maxLength={60} inputMode="email" autoComplete="tel" onChange={(e) => setContato(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.suave }}>
          {primeiroNome(falecido) ? `Como você conhecia ${primeiroNome(falecido)}? (opcional)` : "Sua relação com a família (opcional)"}
          <select style={campo} value={relacao} onChange={(e) => setRelacao(e.target.value)}>
            <option value="">Prefiro não dizer</option>
            {RELACOES_CONVITE.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.suave }}>
          Mensagem
          <textarea style={{ ...campo, minHeight: 110, resize: "vertical" }} value={mensagem} maxLength={2000} onChange={(e) => setMensagem(e.target.value)} />
        </label>
        {erro && <div style={{ fontSize: 13, color: "#b91c1c" }}>{erro}</div>}
        <button type="submit" disabled={enviando} style={{ minHeight: 48, border: "none", borderRadius: 12, background: C.acento, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: enviando ? 0.6 : 1 }}>
          {enviando ? "Enviando..." : "Enviar mensagem"}
        </button>
        <p style={{ margin: 0, fontSize: 12, color: C.suave }}>Sua mensagem e seu contato são vistos somente pela família.</p>
      </form>
    </Bloco>
  );
}

export default function ConvitePublico({ token }) {
  const [carregando, setCarregando] = useState(true);
  const [nomeVisitante, setNomeVisitante] = useState("");
  const [registro, setRegistro] = useState(null);
  const [mapsCemiterio, setMapsCemiterio] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("atendimentos")
        .select("record_id, dados")
        .eq("dados->form->>conviteToken", token)
        .maybeSingle();
      if (!vivo) return;
      setRegistro(data || null);
      const cemiterio = data?.dados?.form?.cemiterio;
      if (cemiterio) {
        const { data: cfg } = await supabase.from("app_settings").select("items").eq("key", "cemeteries").maybeSingle();
        const item = (cfg?.items || []).find((c) => String(c).split("|")[0] === cemiterio);
        const doCadastro = item ? String(item).split("|")[1] : "";
        const conhecido = CEMITERIOS_MAPS[cemiterio];
        const destino = doCadastro
          ? `${doCadastro}, Manaus - AM`
          : conhecido || `Cemitério ${String(cemiterio).replace(/^cemit[ée]rio\s+/i, "")}, Manaus - AM`;
        if (vivo) setMapsCemiterio(destino);
      }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [token]);

  const pagina = { minHeight: "100vh", background: C.fundo, color: C.texto, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: "24px 16px 40px", boxSizing: "border-box" };
  const coluna = { maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 };

  if (carregando) return <div style={pagina}><div style={{ ...coluna, textAlign: "center", color: C.suave }}>Carregando...</div></div>;
  if (!registro) return <div style={pagina}><div style={{ ...coluna, textAlign: "center", color: C.suave }}>Convite não encontrado.</div></div>;

  const f = registro.dados?.form || {};
  const falecido = registro.dados?.falecido || f.falecido || "";
  if (typeof document !== "undefined" && falecido) document.title = `Convite - ${falecido}`;

  let localVelorio = "";
  let destinoVelorio = "";
  if (f.velorioTipo === "funeraria" || !f.velorioTipo) {
    localVelorio = [f.velorioUnidade, f.velorioSala].filter(Boolean).join(" · ");
    destinoVelorio = ENDERECOS_UNIDADES[f.velorioUnidade] || (f.velorioUnidade ? `Funerária ${f.velorioUnidade} Manaus` : "");
  } else if (f.velorioTipo === "residencia" || f.velorioTipo === "igreja") {
    const end = [f.velorioEndereco, f.velorioNumero, f.velorioBairro].filter(Boolean).join(", ");
    localVelorio = [f.velorioTipo === "igreja" ? f.velorioNomeLocal || "Igreja" : "Residência da família", end].filter(Boolean).join(" · ");
    destinoVelorio = end ? `${end}, Manaus - AM` : "";
  } else if (f.velorioTipo === "viagem") {
    localVelorio = f.cidadeDestino ? `Translado para ${f.cidadeDestino}` : "Translado";
  }

  const contatoUnidade = CONTATOS_UNIDADES[f.unidadeAtendimento] || null;

  // Mensagem pronta para o WhatsApp da unidade que atendeu
  const linkServico = (sv) => {
    const quem = nomeVisitante.trim() ? `Olá, sou ${nomeVisitante.trim()}` : "Olá";
    const nomeFalecido = String(falecido).toLowerCase().replace(/(^|\s)(\S)/g, (m, e, l) => e + l.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase());
    const texto = `${quem} e quero saber mais sobre ${sv.assunto}. Vim do velório de ${nomeFalecido}. Pode me ajudar?`;
    return `https://wa.me/55${contatoUnidade.whatsapp}?text=${encodeURIComponent(texto)}`;
  };
  const dataVelorio = dataBR(f.dataInicioVelorio || f.dataAtendimento);
  const horaVelorio = f.horarioVelorio || f.inicioAs || "";

  return (
    <div style={pagina}>
      <main style={coluna}>
        <div style={{ textAlign: "center", paddingBottom: 4 }}>
          <img src="/logogrupo.png" alt="Grupo São Francisco" style={{ width: 110, height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <header style={{ textAlign: "center", padding: "8px 8px 6px" }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: C.suave, textTransform: "uppercase", marginBottom: 8 }}>Em memória de</div>
          {f.fotoUrl && (
            <img
              src={f.fotoUrl}
              alt={`Foto de ${falecido}`}
              style={{ display: "block", width: 200, maxWidth: "70%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 18, margin: "6px auto 16px", border: `1px solid ${C.linha}`, background: "#e9e5dd" }}
            />
          )}
          <h1 style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{falecido}</h1>
          {(f.dataNascimento || f.dataFalecimento) && (
            <div style={{ marginTop: 10, fontSize: 15, color: C.suave }}>
              {f.dataNascimento ? dataBR(f.dataNascimento) : ""}
              {f.dataNascimento && f.dataFalecimento ? "  —  " : ""}
              {f.dataFalecimento ? dataBR(f.dataFalecimento) : ""}
            </div>
          )}
        </header>

        {f.mensagemFamilia && (
          <section style={{ textAlign: "center", padding: "6px 12px 4px", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 17, lineHeight: 1.6, color: C.texto }}>
            “{f.mensagemFamilia}”
            <div style={{ marginTop: 6, fontStyle: "normal", fontFamily: "inherit", fontSize: 13, color: C.suave }}>— A família</div>
          </section>
        )}

        <Bloco icone="fa-solid fa-dove" titulo="Velório">
          {localVelorio && <div style={{ fontSize: 17, fontWeight: 700 }}>{localVelorio}</div>}
          {(dataVelorio || horaVelorio) && (
            <div style={{ fontSize: 15, color: C.suave }}>Início: {dataVelorio}{horaVelorio ? ` às ${horaVelorio}` : ""}</div>
          )}
          <BotaoMapa destino={destinoVelorio} />
        </Bloco>

        {(f.cemiterio || f.dataSaida) && (
          <Bloco icone="fa-solid fa-leaf" titulo="Sepultamento">
            {f.cemiterio && <div style={{ fontSize: 17, fontWeight: 700 }}>{f.cemiterio}</div>}
            {f.dataSaida && <div style={{ fontSize: 15, color: C.suave }}>Data: {dataBR(f.dataSaida)}</div>}
            {f.horaSaida && <div style={{ fontSize: 15, color: C.suave }}>Saída do cortejo: {f.horaSaida}</div>}
            <BotaoMapa destino={mapsCemiterio} />
          </Bloco>
        )}

        <FormMensagem recordId={registro.record_id} token={token} falecido={falecido} nome={nomeVisitante} setNome={setNomeVisitante} />

        {contatoUnidade?.whatsapp && (
          <Bloco icone="fa-solid fa-hand-holding-heart" titulo="Podemos ajudar">
            <p style={{ margin: "0 0 6px", fontSize: 14, color: C.suave, lineHeight: 1.5 }}>
              Fale com a {contatoUnidade.nome} pelo WhatsApp.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.suave, marginBottom: 4 }}>
              Seu nome
              <input
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.linha}`, borderRadius: 12, padding: "12px 14px", fontSize: 16, color: C.texto, background: "#fff", fontFamily: "inherit" }}
                value={nomeVisitante}
                maxLength={120}
                onChange={(e) => setNomeVisitante(e.target.value)}
              />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SERVICOS_CONVITE.map((sv) => (
                <a
                  key={sv.id}
                  href={linkServico(sv)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 16px", borderRadius: 12, border: `1px solid ${C.linha}`, color: C.texto, textDecoration: "none", fontSize: 15, fontWeight: 600, background: "#fff" }}
                >
                  <i className={sv.icone} aria-hidden="true" style={{ color: C.acento, width: 18, textAlign: "center" }} />
                  <span style={{ flex: 1 }}>{sv.titulo}</span>
                  <i className="fa-brands fa-whatsapp" aria-hidden="true" style={{ color: "#15803d", fontSize: 18 }} />
                </a>
              ))}
            </div>
          </Bloco>
        )}

        {contatoUnidade && (contatoUnidade.telefones.length > 0 || contatoUnidade.endereco) && (
          <Bloco icone="fa-solid fa-phone" titulo="Atendimento">
            <div style={{ fontSize: 16, fontWeight: 700 }}>{contatoUnidade.nome}</div>
            {contatoUnidade.endereco && <div style={{ fontSize: 14, color: C.suave }}>{contatoUnidade.endereco}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {contatoUnidade.telefones.map((t) => (
                <a key={t} href={`tel:${t.replace(/\D/g, "")}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1px solid ${C.linha}`, color: C.texto, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  <i className="fa-solid fa-phone" aria-hidden="true" />{t}
                </a>
              ))}
              {contatoUnidade.whatsapp && (
                <a href={`https://wa.me/55${contatoUnidade.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 14px", borderRadius: 12, background: "#15803d", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                  <i className="fa-brands fa-whatsapp" aria-hidden="true" />WhatsApp
                </a>
              )}
            </div>
          </Bloco>
        )}

        {INSTAGRAM_GRUPO && (
          <a href={INSTAGRAM_GRUPO} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 18px", borderRadius: 999, border: `1px solid ${C.linha}`, background: C.card, color: C.texto, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            <i className="fa-brands fa-instagram" aria-hidden="true" />Siga o Grupo São Francisco
          </a>
        )}

        <footer style={{ textAlign: "center", fontSize: 12, color: C.suave, paddingTop: 6 }}>
          Grupo São Francisco · Assistência e cuidado em todos os momentos
        </footer>
      </main>
    </div>
  );
}
