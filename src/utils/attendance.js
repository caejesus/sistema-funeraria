import { OPERATION_STAGES, TRANSPORT_STAGE_KEYS } from "../constants";

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function currentTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function isTransportStage(stageKey) {
  return TRANSPORT_STAGE_KEYS.includes(stageKey);
}

export function createOperationStages() {
  return OPERATION_STAGES.reduce((acc, stage) => {
    acc[stage.key] = {
      status: "nao_iniciado",
      start: "",
      end: "",
      driver: "",
      car: "",
      attendant: "",
      technician: "",
      support: "",
      startedBy: "",
      startedById: "",
      startedAt: "",
      finishedBy: "",
      finishedById: "",
      finishedAt: "",
    };
    return acc;
  }, {});
}

export function getOperationStatusLabel(status) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "finalizado") return "Finalizado";
  return "Não iniciado";
}

export function getAttendanceOperationalStatus(stages = {}) {
  const values = OPERATION_STAGES.map(
    (stage) => stages?.[stage.key]?.status || "nao_iniciado"
  );
  if (values.length && values.every((v) => v === "finalizado")) return "Concluído";
  if (values.some((v) => v === "em_andamento")) return "Em andamento";
  if (values.some((v) => v === "finalizado")) return "Em progresso";
  return "Aguardando início";
}

export function getNextAttendanceNumber(atendimentos) {
  const year = new Date().getFullYear();
  const yearItems = atendimentos.filter((item) =>
    String(item.numero || "").startsWith(`ATD-${year}-`)
  );
  const next = yearItems.length + 1;
  return `ATD-${year}-${String(next).padStart(4, "0")}`;
}

const VALID_ROLES = ["ADM", "SUPERVISOR", "ATENDENTE", "MOTORISTA", "TECNICO", "APOIO", "ONIBUS"];

export function normalizeRole(role = "") {
  const r = String(role || "").toUpperCase().trim();
  if (r === "OPERADOR") return "ATENDENTE";
  if (r === "EQUIPE")   return "MOTORISTA";  // retrocompatibilidade
  return VALID_ROLES.includes(r) ? r : (r || "ATENDENTE");
}

const ROLE_LABELS = {
  ADM:        "Administrador",
  SUPERVISOR: "Supervisor",
  ATENDENTE:  "Atendente",
  MOTORISTA:  "Motorista",
  TECNICO:    "Técnico",
  APOIO:      "Apoio",
  ONIBUS:     "Ônibus",
};

export function getRoleUiLabel(role = "") {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || normalized || "Atendente";
}

export function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}
