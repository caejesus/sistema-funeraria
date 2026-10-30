import { useEffect, useState } from "react";

// Relógio que atualiza a cada `intervaloMs` — usado para marcar saídas atrasadas e disparar avisos
export function useAgora(intervaloMs = 30000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}
