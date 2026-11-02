import React, { useState } from "react";
import Cropper from "react-easy-crop";

// Janela para recortar a foto no formato retrato (4:5) antes de enviar
export function FotoRecorteModal({ imagem, onCancelar, onConfirmar }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);

  const botao = {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={{ background: "var(--card-bg)", borderRadius: 18, width: "100%", maxWidth: 440, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-soft)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>Recortar foto</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Arraste para posicionar e use o zoom para aproximar.</div>
        </div>

        <div style={{ position: "relative", width: "100%", height: "min(60vh, 420px)", background: "#111" }}>
          <Cropper
            image={imagem}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={4}
            aspect={4 / 5}
            showGrid={false}
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            style={{ cropAreaStyle: { borderRadius: 16, border: "2px solid rgba(255,255,255,0.9)" } }}
          />
        </div>

        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <i className="fa-solid fa-magnifying-glass-minus" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <i className="fa-solid fa-magnifying-glass-plus" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
        </div>

        <div style={{ padding: "0 18px 18px", display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancelar} style={{ ...botao, border: "1px solid var(--border-soft)", background: "var(--card-bg)", color: "var(--text-main)" }}>
            Cancelar
          </button>
          <button type="button" disabled={!area} onClick={() => onConfirmar(area)} style={{ ...botao, border: "none", background: "var(--brand-accent)", color: "#fff", opacity: area ? 1 : 0.6 }}>
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}
