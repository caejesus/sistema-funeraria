import { todayDate, currentTime } from "./attendance";

export function getInitialForm() {
  return {
    falecido: "",
    sexo: "",
    dataNascimento: "",
    peso: "",
    altura: "",
    localObito: "",
    cemiterio: "",
    dataFalecimento: todayDate(),
    horaFalecimento: currentTime(),
    dataSaida: todayDate(),
    horaSaida: currentTime(),
    horaAtendimento: currentTime(),
    dataAtendimento: todayDate(),
    chegouClinica: "",
    inicioAs: "",
    tipoPlano: "particular",
    plano: "",
    codigo: "",
    dependente: "",

    responsavelNome: "",
    responsavelRg: "",
    responsavelCpf: "",
    responsavelCep: "",
    responsavelEndereco: "",
    responsavelNumero: "",
    responsavelBairro: "",
    responsavelCelular1: "",
    responsavelCelular2: "",

    velorioTipo: "funeraria",
    velorioNomeLocal: "",
    velorioCep: "",
    velorioEndereco: "",
    velorioNumero: "",
    velorioBairro: "",
    velorioUnidade: "",
    velorioSala: "",
    cidadeDestino: "",
    embarque: "",

    atendenteGeral: "",
    carroGeral: "",

    atendenteRemocao: "",
    Remocao: "",
    carroRemocao: "",

    atendenteEntrega: "",
    Entrega: "",
    carroEntrega: "",

    atendenteSepultamento: "",
    Sepultamento: "",
    carroSepultamento: "",

    parentesco: "",

    necropsia: "nao",
    veioVestido: "sim",
    roupaDestino: "",
    retirarEsmalte: "nao",

    barbear: "sim",
    bigode: "nao",
    cavanhaque: "nao",

    maquiagem: "sim",
    maquiagemTipo: "leve",

    ornamentacao: "sim",
    tipoFlor: "",

    joias: "nao",
    joiasQuais: "",

    roupaEntreguePara: "motorista",

    tempoVelorioValor: "",
    tempoVelorioUnidade: "horas",
    horarioVelorio: "",

    religiao: "católico",
    tecnico: "",
    apoio: "",
    motorista: "",

    modeloUrna: "0X",
    refUrna: "",
    corUrna: "",

    observacaoTermo: "",
  };
}
