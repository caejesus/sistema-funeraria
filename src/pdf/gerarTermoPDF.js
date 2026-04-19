import jsPDF from "jspdf";

export function gerarTermoPdf({ form, formatDateBR, openPdfPreview }) {

  const doc = new jsPDF("p", "mm", "a4");
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(0.2);
  
      const left = 15;
      let y = 18;
  
      function safeText(value) {
        return String(value || "");
      }
  
      function upper(value) {
        return safeText(value).toUpperCase();
      }
  
      function line(x1, yy, x2) {
        doc.line(x1, yy, x2, yy);
      }
  
      function writeLineValue(label, value, x, yy, xLineStart, xLineEnd, options = {}) {
        const valueX = options.valueX ?? xLineStart + 1.5;
        doc.text(label, x, yy);
        const text = safeText(value);
        if (text) {
          doc.text(text, valueX, yy);
        }
        line(xLineStart, yy + 0.6, xLineEnd);
      }
  
      function drawCheckbox(x, yy, checked) {
        const boxTop = yy - 3.1;
        doc.rect(x, boxTop, 3.3, 3.3);
        if (checked) {
          doc.setFont("times", "bold");
          doc.setFontSize(9);
          doc.text("X", x + 0.85, yy - 0.25);
          doc.setFont("times", "normal");
          doc.setFontSize(10);
        }
      }
  
      function checkboxOption(x, yy, checked, label) {
        drawCheckbox(x, yy, checked);
        doc.text(label, x + 5, yy);
      }
  
      const dataAtual = new Date();
      const dia = String(dataAtual.getDate()).padStart(2, "0");
      const ano = dataAtual.getFullYear();
      const meses = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro",
      ];
      const mes = meses[dataAtual.getMonth()];
  
      const localVelorioMarcacao = {
        funeraria: form.velorioTipo === "funeraria",
        residencia: form.velorioTipo === "residencia",
        igreja: form.velorioTipo === "igreja",
        viagem: form.velorioTipo === "viagem",
        interior: form.velorioTipo === "interior",
      };
  
      let modeloUrnaTexto = upper(form.modeloUrna);
      if (form.modeloUrna === "luxo" && form.refUrna) {
        modeloUrnaTexto = `LUXO REF: ${upper(form.refUrna)}`;
      }
  
      const tempoVelorio = safeText(form.tempoVelorioValor);
      const horarioVelorio = safeText(form.horarioVelorio);
      const tecnicoNome = upper(form.tecnico);
      const atendenteNome = upper(form.atendenteGeral || form.atendenteEntrega);
  
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text("TERMO DE AUTORIZAÇÃO PREPARO DO CORPO", 105, y, { align: "center" });
  
      y += 11;
      doc.setFont("times", "normal");
      doc.setFontSize(10);
  
      doc.text("Pelo presente eu,", left, y);

// Nome
let x = left + doc.getTextWidth("Pelo presente eu, ") + 2;
doc.text(upper(form.responsavelNome), x, y);

let nomeWidth = doc.getTextWidth(upper(form.responsavelNome));
line(x, y + 0.6, x + nomeWidth + 2);

// RG
x = x + nomeWidth + 6;
doc.text("RG:", x, y);

x += doc.getTextWidth("RG: ");
doc.text(safeText(form.responsavelRg), x, y);

let rgWidth = doc.getTextWidth(safeText(form.responsavelRg));
line(x, y + 0.6, x + rgWidth + 2);

// CPF
x = x + rgWidth + 6;
doc.text("CPF:", x, y);

x += doc.getTextWidth("CPF: ");
doc.text(safeText(form.responsavelCpf), x, y);

let cpfWidth = doc.getTextWidth(safeText(form.responsavelCpf));
line(x, y + 0.6, x + cpfWidth + 2);
  
      y += 7;
      doc.text("Representante legal do falecido:", left, y);
      doc.text(upper(form.falecido), 67, y);
      line(67, y + 0.6, 196);
  
      y += 7;
      doc.text("Local do óbito:", left, y);
      doc.text(upper(form.localObito), 39, y);
      line(39, y + 0.6, 98);
      doc.text("falecimento:", 102, y);
      doc.text(formatDateBR(form.dataFalecimento), 127, y);
      line(127, y + 0.6, 148);
      doc.text(", hora", 150, y);
      doc.text(safeText(form.horaFalecimento), 163, y);
      line(163, y + 0.6, 182);
  
      y += 7;
      doc.text("grau de parentesco com o falecido:", left, y);
      doc.text(upper(form.parentesco), 73, y);
      line(73, y + 0.6, 196);
  
      y += 12;
      const paragrafo = doc.splitTextToSize(
        "Solicito e autorizo, após obter as informações sobre o procedimento, da realização de Tanatopraxia para conservar e manter a aparência normal do corpo do mesmo. Autorizo também o registro de imagens do procedimento realizado em caráter sigiloso, com o único propósito de esclarecer quaisquer dúvidas que possam surgir quanto ao ato realizado.",
        180
      );
      doc.text(paragrafo, left, y);
      y += paragrafo.length * 5.2 + 5;
  
      doc.setFont("times", "bold");
      doc.text("CORPO", left, y);
      y += 8;
      doc.setFont("times", "normal");
  
      doc.text("· Condições do corpo:", left, y);
      checkboxOption(72, y, form.necropsia === "sim", "Necropsiado");
      checkboxOption(118, y, form.necropsia === "nao", "Não Necropsiado.");
  
      y += 8;
      doc.text("· Falecido veio vestido:", left, y);
      checkboxOption(72, y, form.veioVestido === "sim", "Sim");
      checkboxOption(95, y, form.veioVestido === "nao", "Não");
  
      y += 8;
      doc.text("· Retirar o esmalte da unha:", left, y);
      checkboxOption(72, y, form.retirarEsmalte === "sim", "Sim");
      checkboxOption(95, y, form.retirarEsmalte === "nao", "Não");
  
      y += 8;
      doc.text("· Ornamentação:", left, y);
      checkboxOption(72, y, form.ornamentacao === "sim", "Sim");
      checkboxOption(95, y, form.ornamentacao === "nao", "Não");
      doc.text("-", 118, y);
      checkboxOption(123, y, form.tipoFlor === "naturais", "Naturais");
      checkboxOption(157, y, form.tipoFlor === "artificiais", "Artificiais");
  
      y += 8;
      doc.text("· Barbear:", left, y);
      checkboxOption(72, y, form.barbear === "sim", "Sim");
      checkboxOption(95, y, form.barbear === "nao", "Não");
  
      y += 8;
      doc.text("· Bigode:", left, y);
      checkboxOption(72, y, form.bigode === "sim", "Sim");
      checkboxOption(95, y, form.bigode === "nao", "Não");
  
      y += 8;
      doc.text("· Cavanhaque:", left, y);
      checkboxOption(72, y, form.cavanhaque === "sim", "Sim");
      checkboxOption(95, y, form.cavanhaque === "nao", "Não");
  
      y += 8;
      doc.text("· Maquiagem:", left, y);
      checkboxOption(72, y, form.maquiagem === "sim", "Sim");
      checkboxOption(95, y, form.maquiagem === "nao", "Não");
      doc.text("-", 118, y);
      checkboxOption(123, y, form.maquiagemTipo === "leve", "Leve");
      checkboxOption(145, y, form.maquiagemTipo === "natural", "Natural");
      checkboxOption(171, y, form.maquiagemTipo === "forte", "Forte");
  
      y += 10;
      doc.text("· Joias:", left, y);
      checkboxOption(30, y, form.joias === "sim", "Sim");
      checkboxOption(48, y, form.joias === "nao", "Não");
      writeLineValue("Quais:", safeText(form.joiasQuais), 66, y, 80, 196, { valueX: 81.5 });
  
      y += 8;
      writeLineValue("· A roupa foi entregue para:", upper(form.roupaEntreguePara), left, y, 63, 196, { valueX: 64.5 });
  
      y += 8;
      doc.text("· Tempo previsto de velório:", left, y);
      doc.text(tempoVelorio, 65, y);
      line(65, y + 0.6, 97);
      doc.text("horas ou", 100, y);
      doc.text(form.tempoVelorioUnidade === "dias" ? tempoVelorio : "", 125, y);
      line(125, y + 0.6, 151);
      doc.text("dias", 154, y);
  
      y += 8;
      doc.text("· Local do velório:", left, y);
      checkboxOption(48, y, localVelorioMarcacao.funeraria, "funerária");
      checkboxOption(86, y, localVelorioMarcacao.residencia, "residência");
      checkboxOption(128, y, localVelorioMarcacao.igreja, "igreja");
      checkboxOption(158, y, localVelorioMarcacao.viagem, "vai viajar");
  
      y += 8;
      writeLineValue("· Sala:", upper(form.velorioSala), left, y, 26, 92, { valueX: 27.5 });
      writeLineValue("Horário:", horarioVelorio, 94, y, 114, 152, { valueX: 115.5 });
  
      y += 8;
      writeLineValue("· Religião:", upper(form.religiao), left, y, 36, 196, { valueX: 37.5 });
  
      y += 8;
      writeLineValue("· Técnico:", tecnicoNome, left, y, 34, 196, { valueX: 35.5 });
  
      y += 8;
      writeLineValue("· Atendente:", atendenteNome, left, y, 40, 196, { valueX: 41.5 });
  
      y += 8;
      writeLineValue("· Modelo de urna:", modeloUrnaTexto, left, y, 49, 114, { valueX: 50.5 });
      writeLineValue("Cor:", upper(form.corUrna), 118, y, 128, 196, { valueX: 129.5 });
  
      y += 20;
      doc.text(`Manaus, ${dia} de ${mes} de ${ano}`, left + 105, y);
  
      y += 20;
      doc.line(65, y, 140, y);
      y += 6;
      doc.text("Responsável", 93, y, { align: "center" });
  
      const filename = `termo-${(form.falecido || "atendimento")
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`;
  
      openPdfPreview(doc, filename, "Pré-visualização do Termo");
    }