import React from "react";
import { styles } from "../styles/appStyles";

export function PdfPreviewModal({ pdfPreview, onClose, onDownload, onPrint }) {
  if (!pdfPreview.open) return null;

  return (
    <div style={styles.previewOverlay}>
      <div style={styles.previewModal}>
        <div style={styles.previewHeader}>
          <h3 style={{ margin: 0 }}>{pdfPreview.title}</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={styles.outlineDarkBtn} onClick={onPrint}>
              <i className="fa-solid fa-print" style={styles.buttonIcon} /> Imprimir
            </button>
            <button style={styles.primaryBtn} onClick={onDownload}>
              <i className="fa-solid fa-download" style={styles.buttonIcon} /> Download
            </button>
            <button style={styles.outlineDangerBtn} onClick={onClose}>
              <i className="fa-solid fa-xmark" style={styles.buttonIcon} /> Fechar
            </button>
          </div>
        </div>
        <iframe
          src={pdfPreview.url}
          title="Pré-visualização PDF"
          style={styles.previewFrame}
        />
      </div>
    </div>
  );
}
