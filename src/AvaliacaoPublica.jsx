import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { AvaliacaoForm, S } from "./AcompanhamentoPublico.jsx";
import { CodigoFamilia, lerCodigoSalvo, salvarCodigo, esquecerCodigo } from "./components/CodigoFamilia.jsx";

// Página de avaliação da família (/avaliacao/<token>), separada do acompanhamento.
// Só abre com o código da família; uma avaliação por atendimento.
export default function AvaliacaoPublica({ token = "" }) {
  const [codigo, setCodigo] = useState(() => lerCodigoSalvo(token));
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(!!lerCodigoSalvo(token));
  const [erroCodigo, setErroCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [mediaEnviada, setMediaEnviada] = useState(null);

  useEffect(() => {
    if (!token || !codigo) return undefined;
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.rpc("avaliacao_publica", { p_token: token, p_codigo: codigo });
      if (!vivo) return;
      if (error) console.error("Erro ao carregar avaliação:", error);
      if (data?.ok) {
        salvarCodigo(token, codigo);
        setDados(data);
        setErroCodigo("");
        if (typeof document !== "undefined" && data.falecido) document.title = `Avaliação - ${data.falecido}`;
      } else {
        if (data && data.ok === false) {
          esquecerCodigo(token);
          setErroCodigo("Código de acesso incorreto.");
        } else {
          setErroCodigo("Não foi possível carregar agora. Tente novamente.");
        }
        setCodigo("");
      }
      setCarregando(false);
      setVerificando(false);
    })();
    return () => { vivo = false; };
  }, [token, codigo]);

  if (!codigo) {
    return (
      <CodigoFamilia
        titulo="Avaliação do atendimento"
        botao="Avaliar"
        erro={erroCodigo}
        verificando={verificando}
        onEnviar={(c) => { setVerificando(true); setCarregando(true); setCodigo(c); }}
      />
    );
  }

  const media = mediaEnviada ?? dados?.avaliacao?.media_geral ?? null;
  const jaAvaliou = mediaEnviada != null || !!dados?.avaliacao;

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ background: "#fff", borderRadius: 18, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <img src="/logogrupo.png" alt="Grupo São Francisco" style={{ maxWidth: 200, height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        {carregando || !dados ? (
          <div style={{ ...S.card, textAlign: "center" }}>Carregando...</div>
        ) : (
          <>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#93c5fd", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                Avaliação do atendimento
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc" }}>{dados.falecido || ""}</div>
            </div>

            {jaAvaliou ? (
              <div style={{ ...S.card, textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
                  Obrigado pela sua avaliação!
                </div>
                {media != null && (
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>Avaliação média: {Number(media).toFixed(1)} / 5</div>
                )}
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 10, lineHeight: 1.6 }}>
                  O Grupo São Francisco agradece pela confiança. Permanecemos à disposição da família.
                </div>
              </div>
            ) : (
              <AvaliacaoForm atendimento={dados} token={token} codigo={codigo} onEnviado={(m) => setMediaEnviada(m)} />
            )}
          </>
        )}

        <div style={{ textAlign: "center", fontSize: 12, color: "#1e3a4a", marginTop: 20 }}>
          © 2026 Caetano Digital Systems
        </div>
      </div>
    </div>
  );
}
