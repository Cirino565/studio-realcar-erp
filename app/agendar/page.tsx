import AgendarClient from "./AgendarClient";

export const metadata = {
  title: "Agendar horário · Studio Realçar",
  description: "Escolha um horário disponível para o seu atendimento.",
};

// Página aberta, sem login: é o link que a cliente recebe pelo WhatsApp.
// Ela não lê nem mostra nenhum dado de outras clientes - só a lista de
// horários livres, calculada pela mesma regra da agenda interna.
export default function AgendarPage() {
  return <AgendarClient />;
}