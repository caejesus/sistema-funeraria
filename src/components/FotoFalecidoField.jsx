import React, { useRef, useState } from "react";
import { enviarFotoFalecido, removerFotoFalecido, iniciais } from "../utils/fotoFalecido";

// Campo "Foto para o convite" do cadastro do atendimento
export function FotoFalecidoField({ fotoUrl, fotoPath, falecido, onChange }) {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function escolher(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro("");
    setEnviando(true);
    try {
      const nova = await enviarFotoFalecido(file, fotoPath);
      onChange(nova);
    } catch (err) {
      console.error(err);
      setErro(err.message || "Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    if (!window.confirm("Remover a foto deste atendimento?")) return;
    setEnviando(true);
    await removerFotoFalecido(fotoPath);
    onChange({ fotoUrl: "", fotoPath: "" });
    setEnviando(false);
  }

  const botao = {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid var(--border-soft)",
    background: "var(--card-bg)",
    color: "var(--text-main)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div
        style={{
          width: 88,
          height: 110,
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--card-bg-alt)",
          border: "1px solid var(--border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 22,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {fotoUrl ? (
          <img src={fotoUrl} alt={`Foto de ${falecido || "falecido"}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          iniciais(falecido)
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input ref={inputRef} type="file" accept="image/*" onChange={escolher} style={{ display: "none" }} />
        <button type="button" style={botao} disabled={enviando} onClick={() => inputRef.current?.click()}>
          <i className="fa-solid fa-camera" aria-hidden="true" />
          {enviando ? "Enviando..." : fotoUrl ? "Trocar foto" : "Adicionar foto"}
        </button>
        {fotoUrl && !enviando && (
          <button type="button" style={{ ...botao, color: "#b91c1c" }} onClick={remover}>
            <i className="fa-solid fa-trash" aria-hidden="true" />
            Remover
          </button>
        )}
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>A foto é reduzida antes de enviar.</div>
        {erro && <div style={{ fontSize: 12, color: "#b91c1c" }}>{erro}</div>}
      </div>
    </div>
  );
}
