import React, { useState } from "react";
import "./equipe.css";

export default function Equipe({ atendimentos = [], updateOperationalStage }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="equipe-page">
      <div className="equipe-header">
        <h2>Tela da equipe</h2>
        <span>Operação em tempo real</span>
      </div>

      {atendimentos.map((item) => {
        const isOpen = expandedId === item.id;
        const form = item.form || {};
        const stages = item.operationalStages || {};

        return (
          <div key={item.id} className="card">
            <div
              className="card-header"
              onClick={() => setExpandedId(isOpen ? null : item.id)}
            >
              <div>
                <strong>{item.numero}</strong>
                <h3>{item.falecido}</h3>
              </div>
              <span className="status">{item.status}</span>
            </div>

            {isOpen && (
              <div className="card-body">

                {/* REMOÇÃO */}
                <div className={`stage ${stages.remocao?.status}`}>
                  <h4>Remoção</h4>
                  <p><b>Local:</b> {form.localObito}</p>
                  <p><b>Motorista:</b> {stages.remocao?.driver}</p>
                  <button onClick={() => updateOperationalStage(item.id, "remocao")}>
                    {stages.remocao?.status === "em_andamento" ? "Finalizar" : "Iniciar"}
                  </button>
                </div>

                {/* PROCEDIMENTO */}
                <div className={`stage ${stages.procedimentoClinico?.status}`}>
                  <h4>Procedimento</h4>
                  <p><b>Tanatopraxia:</b> {form.tanato === "sim" ? "Sim" : "Não"}</p>
                  {form.tanato === "sim" && (
                    <button onClick={() => updateOperationalStage(item.id, "procedimentoClinico")}>
                      {stages.procedimentoClinico?.status === "em_andamento" ? "Finalizar" : "Iniciar"}
                    </button>
                  )}
                </div>

                {/* ENTREGA */}
                <div className={`stage ${stages.entrega?.status}`}>
                  <h4>Entrega</h4>
                  <p><b>Local:</b> {form.velorioNomeLocal}</p>
                  <button onClick={() => updateOperationalStage(item.id, "entrega")}>
                    {stages.entrega?.status === "em_andamento" ? "Finalizar" : "Iniciar"}
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
