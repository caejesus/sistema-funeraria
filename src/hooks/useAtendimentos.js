import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  createOperationStages,
  getAttendanceOperationalStatus,
  getNextAttendanceNumber,
  currentTime,
} from "../utils/attendance";
import { getInitialForm } from "../utils/initialForm";
import { initialServices } from "../constants";

function getPreparedFormData(sourceForm) {
  return {
    ...sourceForm,
    atendenteRemocao: sourceForm.atendenteGeral,
    atendenteEntrega: sourceForm.atendenteGeral,
    atendenteSepultamento: sourceForm.atendenteGeral,
    carroRemocao: sourceForm.carroGeral,
    carroEntrega: sourceForm.carroGeral,
    carroSepultamento: sourceForm.carroGeral,
    Remocao: sourceForm.motorista,
    Entrega: sourceForm.motorista,
    Sepultamento: sourceForm.motorista,
  };
}

export function useAtendimentos({
  session,
  editingAttendanceId,
  viewingAttendanceId,
  setForm,
  setServices,
  setViewingAttendanceId,
  setEditingAttendanceId,
  setFinalizado,
  onRecordDeleted,
}) {
  const [atendimentos, setAtendimentos] = useState([]);
  const onRecordDeletedRef = useRef(onRecordDeleted);

  useEffect(() => {
    onRecordDeletedRef.current = onRecordDeleted;
  });

  useEffect(() => {
    async function carregarAtendimentos() {
      const { data, error } = await supabase
        .from("atendimentos")
        .select("*")
        .order("id", { ascending: false });
      if (error) { console.error("Erro ao carregar:", error); return; }
      setAtendimentos((data || []).map((item) => {
        const record = item.dados || item;
        if (record?.form?.tipoPlano === "socio") {
          return { ...record, form: { ...record.form, tipoPlano: "socio_especial" } };
        }
        return record;
      }));
    }
    carregarAtendimentos();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-atendimentos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atendimentos" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = String(payload.old?.record_id || "");
            setAtendimentos((prev) =>
              prev.filter((item) => String(item.id) !== deletedId)
            );
            onRecordDeletedRef.current?.(deletedId);
            return;
          }
          const novoRegistro = payload.new?.dados || payload.new;
          const novoId = String(payload.new?.record_id || novoRegistro?.id || "");
          if (!novoId) return;
          setAtendimentos((prev) => {
            const exists = prev.some((item) => String(item.id) === novoId);
            if (exists) return prev.map((item) => String(item.id) === novoId ? novoRegistro : item);
            return [novoRegistro, ...prev];
          });
        }
      )
      .subscribe((status) => console.log("Realtime atendimentos:", status));

    return () => supabase.removeChannel(channel);
  }, []);

  async function persistAttendanceRecord(record) {
    const { error } = await supabase.from("atendimentos").upsert(
      [
        {
          record_id: String(record.id),
          codigo: record.codigo,
          falecido: record.form?.falecido || record.falecido || "",
          responsavel: record.form?.responsavelNome || record.responsavelNome || "",
          data_atendimento: record.form?.dataAtendimento || record.dataAtendimento || null,
          status: record.status || "aberto",
          observacoes: record.form?.observacaoTermo || "",
          dados: record,
        },
      ],
      { onConflict: "record_id" }
    );
    if (error) {
      console.error("Erro ao salvar atualização operacional no Supabase:", error);
      alert("Erro ao salvar atualização do painel operacional no banco.");
      return false;
    }
    return true;
  }

  async function updateAttendanceRecord(attendanceId, updater) {
    const currentRecord = atendimentos.find((item) => item.id === attendanceId);
    if (!currentRecord) return false;
    const updatedRecord = updater(currentRecord);
    if (!updatedRecord) return false;
    const saved = await persistAttendanceRecord(updatedRecord);
    if (!saved) return false;

    setAtendimentos((prev) =>
      prev.map((item) => (item.id === attendanceId ? updatedRecord : item))
    );

    if (editingAttendanceId === attendanceId) {
      setForm(JSON.parse(JSON.stringify(updatedRecord.form || getInitialForm())));
      setServices(JSON.parse(JSON.stringify(updatedRecord.services || initialServices)));
    }

    if (viewingAttendanceId === attendanceId) {
      setViewingAttendanceId(String(updatedRecord.id));
    }

    return true;
  }

  async function deleteAttendance(id) {
    const confirmed = window.confirm("Deseja excluir este atendimento salvo?");
    if (!confirmed) return false;
    const { error } = await supabase
      .from("atendimentos")
      .delete()
      .eq("record_id", String(id));
    if (error) {
      console.error("Erro ao excluir no Supabase:", error);
      alert("Erro ao excluir atendimento do banco");
      return false;
    }
    setAtendimentos((prev) => prev.filter((item) => item.id !== id));
    return true;
  }

  async function toggleEquipeAcionada(attendanceId, shouldActivate) {
    await updateAttendanceRecord(attendanceId, (item) => ({
      ...item,
      equipeAcionada: shouldActivate,
      acionadoEm: shouldActivate ? new Date().toISOString() : item.acionadoEm || "",
      updatedAt: new Date().toISOString(),
    }));
  }

  async function finalizarAtendimento(form, services, totalValue) {
    const preparedForm = getPreparedFormData(form);
    const now = new Date().toISOString();
    const recordId = editingAttendanceId || String(Date.now());
    const existingRecord = atendimentos.find((item) => item.id === recordId);

    const existingStages = JSON.parse(
      JSON.stringify(existingRecord?.operationalStages || createOperationStages())
    );

    existingStages.remocao = {
      ...existingStages.remocao,
      driver: existingStages.remocao?.driver || preparedForm.Remocao || preparedForm.motorista || "",
      car: existingStages.remocao?.car || preparedForm.carroRemocao || preparedForm.carroGeral || "",
    };
    existingStages.entrega = {
      ...existingStages.entrega,
      driver: existingStages.entrega?.driver || preparedForm.Entrega || preparedForm.motorista || "",
      car: existingStages.entrega?.car || preparedForm.carroEntrega || preparedForm.carroGeral || "",
    };
    existingStages.sepultamento = {
      ...existingStages.sepultamento,
      driver: existingStages.sepultamento?.driver || preparedForm.Sepultamento || preparedForm.motorista || "",
      car: existingStages.sepultamento?.car || preparedForm.carroSepultamento || preparedForm.carroGeral || "",
    };
    existingStages.atendimento = {
      ...existingStages.atendimento,
      attendant: existingStages.atendimento?.attendant || preparedForm.atendenteGeral || "",
    };
    existingStages.procedimentoClinico = {
      ...existingStages.procedimentoClinico,
      technician: existingStages.procedimentoClinico?.technician || preparedForm.tecnico || "",
    };
    existingStages.ornamentacao = {
      ...existingStages.ornamentacao,
      support: existingStages.ornamentacao?.support || preparedForm.apoio || "",
    };

    const record = {
      id: recordId,
      codigo: existingRecord?.codigo || preparedForm.codigo || `ATD-${Date.now()}`,
      numero: existingRecord?.numero || getNextAttendanceNumber(atendimentos),
      status: getAttendanceOperationalStatus(existingStages),
      createdAt: existingRecord?.createdAt || now,
      updatedAt: now,
      falecido: preparedForm.falecido,
      responsavelNome: preparedForm.responsavelNome,
      cemiterio: preparedForm.cemiterio,
      unidade: preparedForm.velorioUnidade,
      sala: preparedForm.velorioSala,
      localObito: preparedForm.localObito,
      motorista: preparedForm.motorista,
      atendente: preparedForm.atendenteGeral,
      dataAtendimento: preparedForm.dataAtendimento,
      horaAtendimento: preparedForm.horaAtendimento,
      totalValue,
      operationalStages: JSON.parse(JSON.stringify(existingStages)),
      form: JSON.parse(JSON.stringify(preparedForm)),
      services: JSON.parse(JSON.stringify(services)),
      equipeAcionada: existingRecord?.equipeAcionada || false,
      acionadoEm: existingRecord?.acionadoEm || "",
    };

    setForm((prev) => ({ ...preparedForm, codigo: record.codigo }));
    setEditingAttendanceId(recordId);

    const saved = await persistAttendanceRecord(record);
    if (!saved) return;

    setAtendimentos((prev) => {
      const exists = prev.some((item) => item.id === recordId);
      if (exists) return prev.map((item) => (item.id === recordId ? record : item));
      return [record, ...prev];
    });
    setFinalizado(true);
  }

  async function updateOperationalStage(attendanceId, stageKey, action) {
    const now = currentTime();
    await updateAttendanceRecord(attendanceId, (item) => {
      const nextStages = JSON.parse(
        JSON.stringify(item.operationalStages || createOperationStages())
      );
      const currentStage = nextStages[stageKey] || {
        status: "nao_iniciado", start: "", end: "", driver: "", car: "",
        attendant: "", technician: "", support: "",
        startedBy: "", startedById: "", startedAt: "",
        finishedBy: "", finishedById: "", finishedAt: "",
      };

      if (action === "start") {
        nextStages[stageKey] = {
          ...currentStage,
          status: "em_andamento",
          start: currentStage.start || now,
          end: "",
          startedBy: session?.name || currentStage.startedBy || "",
          startedById: session?.id || currentStage.startedById || "",
          startedAt: currentStage.startedAt || new Date().toISOString(),
        };
      }
      if (action === "finish") {
        nextStages[stageKey] = {
          ...currentStage,
          status: "finalizado",
          start: currentStage.start || now,
          end: now,
          finishedBy: session?.name || "",
          finishedById: session?.id || "",
          finishedAt: new Date().toISOString(),
        };
      }

      return {
        ...item,
        operationalStages: nextStages,
        status: getAttendanceOperationalStatus(nextStages),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function updateOperationalTransport(attendanceId, stageKey, field, value) {
    await updateAttendanceRecord(attendanceId, (item) => {
      const nextStages = JSON.parse(
        JSON.stringify(item.operationalStages || createOperationStages())
      );
      nextStages[stageKey] = { ...(nextStages[stageKey] || {}), [field]: value };

      const nextForm = JSON.parse(JSON.stringify(item.form || getInitialForm()));
      if (stageKey === "remocao") {
        if (field === "driver") nextForm.Remocao = value;
        if (field === "car") nextForm.carroRemocao = value;
      }
      if (stageKey === "entrega") {
        if (field === "driver") nextForm.Entrega = value;
        if (field === "car") nextForm.carroEntrega = value;
      }
      if (stageKey === "sepultamento") {
        if (field === "driver") nextForm.Sepultamento = value;
        if (field === "car") nextForm.carroSepultamento = value;
      }

      return { ...item, operationalStages: nextStages, updatedAt: new Date().toISOString(), form: nextForm };
    });
  }

  async function updateOperationalPerson(attendanceId, stageKey, field, value) {
    await updateAttendanceRecord(attendanceId, (item) => {
      const nextStages = JSON.parse(
        JSON.stringify(item.operationalStages || createOperationStages())
      );
      nextStages[stageKey] = { ...(nextStages[stageKey] || {}), [field]: value };

      const nextForm = JSON.parse(JSON.stringify(item.form || getInitialForm()));
      if (stageKey === "atendimento" && field === "attendant") nextForm.atendenteGeral = value;
      if (stageKey === "procedimentoClinico" && field === "technician") nextForm.tecnico = value;
      if (stageKey === "ornamentacao" && field === "support") nextForm.apoio = value;

      return {
        ...item,
        operationalStages: nextStages,
        updatedAt: new Date().toISOString(),
        form: nextForm,
        atendente: stageKey === "atendimento" && field === "attendant" ? value : item.atendente,
      };
    });
  }

  return {
    atendimentos,
    setAtendimentos,
    persistAttendanceRecord,
    deleteAttendance,
    toggleEquipeAcionada,
    finalizarAtendimento,
    updateOperationalStage,
    updateOperationalTransport,
    updateOperationalPerson,
  };
}
