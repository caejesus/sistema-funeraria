import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function gerarDetalhePDF(elementId, filename, openPdfPreview) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth  = pdf.internal.pageSize.getWidth();  // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const margin = 8; // 8mm em todos os lados

    const maxWidth  = pageWidth  - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    // Proporção que faz o conteúdo caber sempre em uma página
    const ratio = Math.min(
      maxWidth  / canvas.width,
      maxHeight / canvas.height
    );

    const imgWidth  = canvas.width  * ratio;
    const imgHeight = canvas.height * ratio;

    // Centralizar horizontalmente, topo com margem
    const xOffset = (pageWidth - imgWidth) / 2;

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      xOffset,
      margin,
      imgWidth,
      imgHeight
    );

    openPdfPreview(pdf, filename, "Detalhes do Serviço");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF.");
  }
}
