import { useState } from "react";

export function usePdfPreview() {
  const [pdfPreview, setPdfPreview] = useState({
    open: false,
    title: "",
    url: "",
    filename: "",
  });

  function openPdfPreview(doc, filename, title) {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfPreview((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return { open: true, title, url, filename };
    });
  }

  function closePdfPreview() {
    setPdfPreview((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return { open: false, title: "", url: "", filename: "" };
    });
  }

  function downloadPreviewPdf() {
    if (!pdfPreview.url) return;
    const a = document.createElement("a");
    a.href = pdfPreview.url;
    a.download = pdfPreview.filename || "documento.pdf";
    a.click();
  }

  function printPreviewPdf() {
    if (!pdfPreview.url) return;
    const printWindow = window.open(pdfPreview.url, "_blank");
    if (!printWindow) {
      alert("Não foi possível abrir a janela de impressão.");
      return;
    }
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return { pdfPreview, openPdfPreview, closePdfPreview, downloadPreviewPdf, printPreviewPdf };
}
