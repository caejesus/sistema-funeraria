import jsPDF from "jspdf";

export default function gerarTermoPDF({ form, formatDateBR, openPdfPreview }) {
  const doc = new jsPDF("p", "mm", "a4");

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("TERMO DE AUTORIZAÇÃO", 105, 20, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  doc.text(`Responsável: ${form.responsavelNome}`, 20, 40);
  doc.text(`Falecido: ${form.falecido}`, 20, 50);
  doc.text(`Data: ${formatDateBR(form.dataSaida)}`, 20, 60);

  const filename = `termo-${(form.falecido || "atendimento")
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  openPdfPreview(doc, filename, "Termo");
}