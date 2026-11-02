import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { SALAS_TABLET, NOME_FUNERARIA_UNIDADE, linkTablet } from "../constants/salasTablet";

// Configurações → links para abrir em cada tablet de sala (só ADM vê)
export function TabletsSalasConfig() {
  const [chave, setChave] = useState("");
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    supabase.from("app_settings").select("items").eq("key", "tablet_chave").maybeSingle().then(({ data, error }) => {
      if (error) console.error("Erro ao carregar chave dos tablets:", error);
      setChave(data?.items?.[0] || "");
    });
  }, []);

  async function copiar(sala) {
    const link = linkTablet(sala, chave);
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(sala.caminho);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      window.prompt("Copie o link:", link);
    }
  }

  const unidades = [...new Set(SALAS_TABLET.map((s) => s.unidade))];

  return (
    <section style={{ background: "var(--card-bg)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 18, marginBottom: 18 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-main)" }}>Tablets das salas</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Abra o link de cada sala no navegador do tablet dela (de preferência em tela cheia). O link tem uma chave: não compartilhe fora da empresa.
      </div>
      {!chave && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</div>}
      {chave && unidades.map((unidade) => (
        <div key={unidade} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            {NOME_FUNERARIA_UNIDADE[unidade] || unidade}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SALAS_TABLET.filter((s) => s.unidade === unidade).map((s) => (
              <span key={s.caminho} style={{ display: "inline-flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => copiar(s)}
                  style={{ minHeight: 38, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border-soft)", background: copiado === s.caminho ? "var(--brand-accent)" : "var(--card-bg-alt)", color: copiado === s.caminho ? "#fff" : "var(--text-main)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  <i className={copiado === s.caminho ? "fa-solid fa-check" : "fa-regular fa-copy"} style={{ marginRight: 6 }} />
                  {s.sala}
                </button>
                <a href={linkTablet(s, chave)} target="_blank" rel="noopener noreferrer" title="Abrir" style={{ minHeight: 38, width: 38, borderRadius: 10, border: "1px solid var(--border-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                </a>
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
