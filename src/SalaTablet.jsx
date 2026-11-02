import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { acharSalaTablet, NOME_FUNERARIA_UNIDADE } from "./constants/salasTablet.js";
import { SERVICOS_CONVITE } from "./constants/unidadesAtendimento.js";

// Tela do tablet na porta da sala de velório (em pé).
// Link: /sala/<unidade>/<sala>?k=<chave>  — a chave fica guardada no tablet.

const C = {
  fundo: "#f4f2ee",
  card: "#ffffff",
  texto: "#1f2a2e",
  suave: "#5b6a6f",
  linha: "#e4e0d8",
  acento: "#0f7f8c",
  acentoClaro: "rgba(15,127,140,0.1)",
  aviso: "#9a5b00",
  avisoClaro: "rgba(234,160,20,0.14)",
};

const INATIVIDADE_MS = 60 * 1000;
const ATUALIZAR_MS = 30 * 1000;

function dataBR(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function nomeBonito(nome) {
  return String(nome || "")
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (m, e, l) => e + l.toUpperCase())
    .replace(/\s(De|Da|Do|Dos|Das|E)(?=\s)/g, (m) => m.toLowerCase());
}

function primeiroNome(nome) {
  return nomeBonito(String(nome || "").trim().split(/\s+/)[0] || "");
}

function lerChave() {
  const daUrl = new URLSearchParams(window.location.search).get("k") || "";
  try {
    if (daUrl) localStorage.setItem("tablet_chave", daUrl);
    return daUrl || localStorage.getItem("tablet_chave") || "";
  } catch {
    return daUrl;
  }
}

const campo = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.linha}`,
  borderRadius: 14,
  padding: "16px 16px",
  fontSize: 19,
  color: C.texto,
  background: "#fff",
  fontFamily: "inherit",
};

function botao(primario) {
  return {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    border: primario ? "none" : `1px solid ${C.linha}`,
    background: primario ? C.acento : C.card,
    color: primario ? "#fff" : C.texto,
    fontSize: 19,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

export default function SalaTablet({ caminho }) {
  const sala = acharSalaTablet(caminho);
  const [chave] = useState(lerChave);
  const [estado, setEstado] = useState({ carregando: true });
  const [tela, setTela] = useState("inicio"); // inicio | mensagem | interesse | obrigado
  const [assunto, setAssunto] = useState(null);
  const [form, setForm] = useState({ nome: "", contato: "", relacao: "", mensagem: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const timerInatividade = useRef(null);

  const voltarInicio = useCallback(() => {
    setTela("inicio");
    setAssunto(null);
    setForm({ nome: "", contato: "", relacao: "", mensagem: "" });
    setErro("");
    setEnviando(false);
  }, []);

  // Busca o que está na sala (e atualiza a cada 30 s)
  useEffect(() => {
    if (!sala) return undefined;
    let vivo = true;
    async function carregar() {
      const { data, error } = await supabase.rpc("sala_publica", { p_chave: chave, p_unidade: sala.unidade, p_sala: sala.sala });
      if (!vivo) return;
      if (error) {
        console.error("Erro ao carregar sala:", error);
        setEstado((atual) => (atual.carregando ? { carregando: false, erroRede: true } : atual));
        return;
      }
      setEstado({ carregando: false, ...(data || {}) });
    }
    carregar();
    const t = setInterval(carregar, ATUALIZAR_MS);
    return () => { vivo = false; clearInterval(t); };
  }, [sala, chave]);

  // Volta sozinho para a tela inicial depois de 1 min sem ninguém mexer
  useEffect(() => {
    function reiniciar() {
      clearTimeout(timerInatividade.current);
      timerInatividade.current = setTimeout(voltarInicio, INATIVIDADE_MS);
    }
    reiniciar();
    window.addEventListener("pointerdown", reiniciar);
    window.addEventListener("keydown", reiniciar);
    return () => {
      clearTimeout(timerInatividade.current);
      window.removeEventListener("pointerdown", reiniciar);
      window.removeEventListener("keydown", reiniciar);
    };
  }, [voltarInicio]);

  // Mantém a tela acesa (quando o navegador permite)
  useEffect(() => {
    let lock = null;
    async function pedir() {
      try { lock = await navigator.wakeLock?.request("screen"); } catch { /* ignora */ }
    }
    pedir();
    const aoVoltar = () => { if (document.visibilityState === "visible") pedir(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      try { lock?.release(); } catch { /* ignora */ }
    };
  }, []);

  useEffect(() => {
    if (tela !== "obrigado") return undefined;
    const t = setTimeout(voltarInicio, 7000);
    return () => clearTimeout(t);
  }, [tela, voltarInicio]);

  const nomeFalecido = nomeBonito(estado.falecido);
  useEffect(() => {
    document.title = sala ? `${sala.sala} · ${NOME_FUNERARIA_UNIDADE[sala.unidade] || sala.unidade}` : "Sala";
  }, [sala]);

  async function enviarMensagem(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.contato.trim() || !form.mensagem.trim()) {
      setErro("Preencha seu nome, um contato e a mensagem.");
      return;
    }
    setEnviando(true);
    setErro("");
    const { data, error } = await supabase.rpc("sala_mensagem", {
      p_chave: chave, p_unidade: sala.unidade, p_sala: sala.sala,
      p_nome: form.nome, p_contato: form.contato, p_relacao: form.relacao, p_mensagem: form.mensagem,
    });
    setEnviando(false);
    if (error || !data?.ok) { setErro(data?.erro || "Não foi possível enviar. Tente novamente."); return; }
    setTela("obrigado");
  }

  async function enviarInteresse(e) {
    e.preventDefault();
    if (!form.nome.trim() || form.contato.replace(/\D/g, "").length < 10) {
      setErro("Preencha seu nome e um WhatsApp com DDD.");
      return;
    }
    setEnviando(true);
    setErro("");
    const { data, error } = await supabase.rpc("sala_interesse", {
      p_chave: chave, p_unidade: sala.unidade, p_sala: sala.sala,
      p_nome: form.nome, p_contato: form.contato, p_assunto: assunto?.titulo || "Informações gerais",
    });
    setEnviando(false);
    if (error || !data?.ok) { setErro(data?.erro || "Não foi possível enviar. Tente novamente."); return; }
    setTela("obrigado");
  }

  const pagina = {
    minHeight: "100vh",
    background: C.fundo,
    color: C.texto,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    padding: "28px 24px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    userSelect: tela === "inicio" ? "none" : "auto",
  };
  const coluna = { width: "100%", maxWidth: 640, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 };
  const cabecalho = sala && (
    <div style={{ textAlign: "center", fontSize: 15, letterSpacing: 2, color: C.suave, textTransform: "uppercase" }}>
      {sala.sala} · {NOME_FUNERARIA_UNIDADE[sala.unidade] || sala.unidade}
    </div>
  );

  // ── Telas de erro / carregando ────────────────────────────────────────────
  if (!sala) {
    return <div style={pagina}><div style={{ ...coluna, justifyContent: "center", textAlign: "center", fontSize: 20 }}>Sala não encontrada. Confira o link do tablet.</div></div>;
  }
  if (estado.carregando) {
    return <div style={pagina}><div style={{ ...coluna, justifyContent: "center", textAlign: "center", fontSize: 20, color: C.suave }}>Carregando...</div></div>;
  }
  if (estado.ok === false) {
    return (
      <div style={pagina}>
        <div style={{ ...coluna, justifyContent: "center", textAlign: "center" }}>
          <img src="/logogrupo.png" alt="Grupo São Francisco" style={{ width: 220, margin: "0 auto 20px" }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>Tablet não autorizado</div>
          <div style={{ fontSize: 16, color: C.suave, marginTop: 8 }}>Abra o link desta sala que está nas Configurações do sistema.</div>
        </div>
      </div>
    );
  }

  // ── Obrigado ──────────────────────────────────────────────────────────────
  if (tela === "obrigado") {
    return (
      <div style={pagina}>
        <div style={{ ...coluna, justifyContent: "center", textAlign: "center", gap: 14 }}>
          <i className="fa-solid fa-heart" style={{ fontSize: 46, color: C.acento }} aria-hidden="true" />
          <div style={{ fontSize: 28, fontWeight: 800 }}>Obrigado!</div>
          <div style={{ fontSize: 19, color: C.suave, lineHeight: 1.5 }}>
            {assunto || estado.ocupada === false
              ? "Recebemos seu contato. Nossa equipe vai falar com você em breve."
              : "Sua mensagem foi entregue à família."}
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário: mensagem para a família ───────────────────────────────────
  if (tela === "mensagem") {
    return (
      <div style={pagina}>
        <form onSubmit={enviarMensagem} style={coluna}>
          {cabecalho}
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25 }}>Mensagem para a família de {primeiroNome(estado.falecido) || nomeFalecido}</div>
          <input style={campo} placeholder="Seu nome" value={form.nome} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <input style={campo} placeholder="Seu WhatsApp ou e-mail" value={form.contato} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} />
          <input style={campo} placeholder={`Como você conhecia ${primeiroNome(estado.falecido) || "a pessoa"}? (opcional)`} value={form.relacao} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, relacao: e.target.value }))} />
          <textarea style={{ ...campo, minHeight: 200, resize: "none" }} placeholder="Sua mensagem" value={form.mensagem} maxLength={2000} onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))} />
          {erro && <div style={{ fontSize: 16, color: "#b91c1c" }}>{erro}</div>}
          <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
            <button type="button" style={botao(false)} onClick={voltarInicio}>Voltar</button>
            <button type="submit" style={{ ...botao(true), opacity: enviando ? 0.7 : 1 }} disabled={enviando}>{enviando ? "Enviando..." : "Enviar"}</button>
          </div>
          <div style={{ fontSize: 13, color: C.suave, textAlign: "center" }}>Só a família lê as mensagens. A tela volta ao início sozinha depois de 1 minuto parada.</div>
        </form>
      </div>
    );
  }

  // ── Formulário: quero receber informações ─────────────────────────────────
  if (tela === "interesse") {
    return (
      <div style={pagina}>
        <form onSubmit={enviarInteresse} style={coluna}>
          {cabecalho}
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25 }}>
            {assunto ? assunto.titulo : "Quero receber informações"}
          </div>
          <div style={{ fontSize: 17, color: C.suave, lineHeight: 1.5 }}>Deixe seu nome e WhatsApp. Nossa equipe entra em contato com você.</div>
          <input style={campo} placeholder="Seu nome" value={form.nome} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <input style={campo} inputMode="tel" placeholder="WhatsApp com DDD" value={form.contato} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} />
          {erro && <div style={{ fontSize: 16, color: "#b91c1c" }}>{erro}</div>}
          <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
            <button type="button" style={botao(false)} onClick={voltarInicio}>Voltar</button>
            <button type="submit" style={{ ...botao(true), opacity: enviando ? 0.7 : 1 }} disabled={enviando}>{enviando ? "Enviando..." : "Enviar"}</button>
          </div>
          <div style={{ fontSize: 13, color: C.suave, textAlign: "center" }}>A tela volta ao início sozinha depois de 1 minuto parada.</div>
        </form>
      </div>
    );
  }

  // ── Tela inicial: sala livre ──────────────────────────────────────────────
  if (!estado.ocupada) {
    return (
      <div style={pagina}>
        <div style={{ ...coluna, gap: 22 }}>
          {cabecalho}
          <div style={{ background: "#fff", borderRadius: 22, padding: "26px 20px", textAlign: "center", marginTop: 20 }}>
            <img src="/logogrupo.png" alt="Grupo São Francisco" style={{ width: "70%", maxWidth: 320, height: "auto" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 20, color: C.suave, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}>
            Assistência e cuidado em todos os momentos
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 14 }}>Podemos ajudar</div>
          {SERVICOS_CONVITE.map((sv) => (
            <button
              key={sv.id}
              type="button"
              onClick={() => { setAssunto(sv); setTela("interesse"); }}
              style={{ display: "flex", alignItems: "center", gap: 16, minHeight: 72, padding: "0 20px", borderRadius: 18, border: `1px solid ${C.linha}`, background: C.card, color: C.texto, fontSize: 20, fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
            >
              <i className={sv.icone} style={{ fontSize: 24, color: C.acento, width: 30, textAlign: "center" }} aria-hidden="true" />
              {sv.titulo}
              <i className="fa-solid fa-chevron-right" style={{ marginLeft: "auto", color: C.suave }} aria-hidden="true" />
            </button>
          ))}
          <button type="button" style={{ ...botao(true), flex: "none", marginTop: "auto" }} onClick={() => { setAssunto(null); setTela("interesse"); }}>
            <i className="fa-solid fa-user-plus" style={{ marginRight: 10 }} aria-hidden="true" />Quero receber informações
          </button>
        </div>
      </div>
    );
  }

  // ── Tela inicial: com velório ─────────────────────────────────────────────
  const f = estado.form || {};
  const horaVelorio = f.horarioVelorio || f.inicioAs || "";
  const dataVelorio = dataBR(f.dataInicioVelorio);
  const horaSaida = f.horaSaida || "";
  const dataSaida = dataBR(f.dataSaida);

  return (
    <div style={pagina}>
      <div style={{ ...coluna, gap: 16, textAlign: "center" }}>
        {cabecalho}
        {f.fotoUrl ? (
          <img
            src={f.fotoUrl}
            alt={`Foto de ${nomeFalecido}`}
            style={{ width: "62%", maxWidth: 360, aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 24, margin: "8px auto 0", border: `1px solid ${C.linha}`, background: "#e9e5dd" }}
          />
        ) : (
          <div style={{ background: "#fff", borderRadius: 22, padding: "22px 20px", margin: "8px auto 0", width: "70%" }}>
            <img src="/logogrupo.png" alt="Grupo São Francisco" style={{ width: "80%", height: "auto" }} />
          </div>
        )}
        <div style={{ fontSize: 14, letterSpacing: 2, color: C.suave, textTransform: "uppercase" }}>Em memória de</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{nomeFalecido}</div>
        {(f.dataNascimento || f.dataFalecimento) && (
          <div style={{ fontSize: 19, color: C.suave }}>
            {dataBR(f.dataNascimento)}{f.dataNascimento && f.dataFalecimento ? "  —  " : ""}{dataBR(f.dataFalecimento)}
          </div>
        )}
        {f.mensagemFamilia && (
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 20, lineHeight: 1.6, color: C.texto, padding: "0 10px" }}>
            “{f.mensagemFamilia}”
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", marginTop: 6 }}>
          {horaVelorio && (
            <div style={{ background: C.card, border: `1px solid ${C.linha}`, borderRadius: 16, padding: "14px 18px", fontSize: 19, display: "flex", alignItems: "center", gap: 12 }}>
              <i className="fa-regular fa-clock" style={{ color: C.acento, width: 22 }} aria-hidden="true" />
              Velório {dataVelorio ? `desde ${dataVelorio} às ${horaVelorio}` : `a partir das ${horaVelorio}`}
            </div>
          )}
          {(horaSaida || f.cemiterio) && (
            <div style={{ background: C.avisoClaro, borderRadius: 16, padding: "14px 18px", fontSize: 19, display: "flex", alignItems: "center", gap: 12, color: C.aviso, fontWeight: 600 }}>
              <i className="fa-solid fa-car-side" style={{ width: 22 }} aria-hidden="true" />
              <span>
                {horaSaida ? `Saída ${dataSaida ? `em ${dataSaida} ` : ""}às ${horaSaida}` : "Sepultamento"}
                {f.cemiterio ? ` · ${f.cemiterio}` : ""}
              </span>
            </div>
          )}
        </div>

        {estado.aceitaMensagens && (
          <button type="button" style={{ ...botao(true), flex: "none", marginTop: "auto", minHeight: 68, fontSize: 20 }} onClick={() => setTela("mensagem")}>
            <i className="fa-regular fa-heart" style={{ marginRight: 10 }} aria-hidden="true" />Deixar uma mensagem para a família
          </button>
        )}
      </div>
    </div>
  );
}
