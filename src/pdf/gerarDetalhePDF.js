import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function gerarDetalhePDF(elementId, filename, openPdfPreview) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 850,
      windowWidth: 850,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth  = pageWidth - 10; // 5mm de margem em cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      // Cabe em uma página: topo com margem de 5mm
      pdf.addImage(imgData, "PNG", 5, 5, imgWidth, imgHeight);
    } else {
      // Múltiplas páginas
      let heightLeft = imgHeight;
      let position   = 0;
      pdf.addImage(imgData, "PNG", 5, 0, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    openPdfPreview(pdf, filename, "Detalhes do Serviço");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF.");
  }
}
