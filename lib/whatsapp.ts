export type WhatsAppTemplateType =
  | "reminder"
  | "confirmation"
  | "reschedule"
  | "postCare"
  | "returnVisit";

export type WhatsAppClientTemplateType =
  | "welcome"
  | "birthday"
  | "returnInvite"
  | "reactivation"
  | "postCare";

export type WhatsAppAppointmentMessageInput = {
  template: WhatsAppTemplateType;
  clientName: string;
  procedure: string;
  appointmentDate: Date | string;
  clinicName?: string;
};

export type WhatsAppClientMessageInput = {
  template: WhatsAppClientTemplateType;
  clientName: string;
  clinicName?: string;
};

export type WhatsAppTemplateOption = {
  id: WhatsAppTemplateType;
  title: string;
  description: string;
};

export type WhatsAppClientTemplateOption = {
  id: WhatsAppClientTemplateType;
  title: string;
  description: string;
};

export const WHATSAPP_TEMPLATE_OPTIONS: WhatsAppTemplateOption[] = [
  {
    id: "reminder",
    title: "Lembrete de agendamento",
    description: "Mensagem direta para lembrar data e horário.",
  },
  {
    id: "confirmation",
    title: "Confirmação de presença",
    description: "Pede confirmação objetiva do comparecimento.",
  },
  {
    id: "reschedule",
    title: "Reagendamento",
    description: "Usada quando é necessário ajustar o horário.",
  },
  {
    id: "postCare",
    title: "Pós-atendimento",
    description: "Acompanhamento após o procedimento realizado.",
  },
  {
    id: "returnVisit",
    title: "Retorno",
    description: "Convite para retorno ou manutenção do tratamento.",
  },
];

export const WHATSAPP_CLIENT_TEMPLATE_OPTIONS: WhatsAppClientTemplateOption[] = [
  {
    id: "welcome",
    title: "Boas-vindas",
    description: "Mensagem inicial para cliente recém-cadastrado.",
  },
  {
    id: "birthday",
    title: "Aniversário",
    description: "Mensagem de relacionamento para aniversariantes.",
  },
  {
    id: "returnInvite",
    title: "Convite de retorno",
    description: "Chamada para manutenção, avaliação ou novo atendimento.",
  },
  {
    id: "reactivation",
    title: "Reativação",
    description: "Contato para cliente sem visita recente.",
  },
  {
    id: "postCare",
    title: "Pós-atendimento",
    description: "Acompanhamento leve após procedimento.",
  },
];



export type WhatsAppMarketingTemplateType =
  | "firstContact"
  | "evaluationInvite"
  | "promotion"
  | "followUp"
  | "reactivationLead";

export type WhatsAppMarketingMessageInput = {
  template: WhatsAppMarketingTemplateType;
  leadName: string;
  interest?: string | null;
  clinicName?: string;
};

export type WhatsAppMarketingTemplateOption = {
  id: WhatsAppMarketingTemplateType;
  title: string;
  description: string;
};

export const WHATSAPP_MARKETING_TEMPLATE_OPTIONS: WhatsAppMarketingTemplateOption[] = [
  {
    id: "firstContact",
    title: "Primeiro contato",
    description: "Resposta profissional para lead recém-chegado.",
  },
  {
    id: "evaluationInvite",
    title: "Convite para avaliação",
    description: "Chamada para transformar interesse em horário marcado.",
  },
  {
    id: "promotion",
    title: "Campanha ou condição",
    description: "Mensagem comercial leve para apresentar oportunidade.",
  },
  {
    id: "followUp",
    title: "Follow-up",
    description: "Retomada de conversa sem pressão.",
  },
  {
    id: "reactivationLead",
    title: "Reativação de lead",
    description: "Contato para lead parado no pipeline.",
  },
];

function formatAppointmentDate(value: Date | string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatAppointmentTime(value: Date | string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getFirstName(clientName: string) {
  return clientName.trim().split(" ")[0] || clientName;
}

export function normalizeBrazilianPhone(phone?: string | null) {
  if (!phone) return "";

  const onlyDigits = phone.replace(/\D/g, "");

  if (!onlyDigits) return "";

  if (onlyDigits.startsWith("55")) {
    return onlyDigits;
  }

  return `55${onlyDigits}`;
}

export function buildWhatsAppMessage({
  template,
  clientName,
  procedure,
  appointmentDate,
  clinicName = "Studio Realçar",
}: WhatsAppAppointmentMessageInput) {
  const firstName = getFirstName(clientName);
  const date = formatAppointmentDate(appointmentDate);
  const time = formatAppointmentTime(appointmentDate);

  const templates: Record<WhatsAppTemplateType, string> = {
    reminder: `Olá, ${firstName}! Tudo bem?\n\nPassando para lembrar do seu horário no ${clinicName}.\n\nProcedimento: ${procedure}\nData: ${date}\nHorário: ${time}\n\nCaso precise remarcar, me avise por aqui. Te esperamos!`,
    confirmation: `Olá, ${firstName}! Tudo bem?\n\nConfirmando seu agendamento no ${clinicName}:\n\nProcedimento: ${procedure}\nData: ${date}\nHorário: ${time}\n\nPode me confirmar sua presença, por favor?`,
    reschedule: `Olá, ${firstName}! Tudo bem?\n\nSobre seu agendamento no ${clinicName} para ${procedure}, preciso verificar com você a possibilidade de ajustar o horário.\n\nO horário atual está para ${date}, às ${time}.\n\nPode me chamar por aqui para combinarmos o melhor horário?`,
    postCare: `Olá, ${firstName}! Tudo bem?\n\nPassando para saber como você está após o procedimento de ${procedure} no ${clinicName}.\n\nSe tiver qualquer dúvida ou desconforto, pode me chamar por aqui.`,
    returnVisit: `Olá, ${firstName}! Tudo bem?\n\nPassando para lembrar que podemos programar seu retorno/manutenção do procedimento de ${procedure} no ${clinicName}.\n\nQuando quiser, me chama por aqui para vermos o melhor horário para você.`,
  };

  return templates[template];
}

export function buildClientWhatsAppMessage({
  template,
  clientName,
  clinicName = "Studio Realçar",
}: WhatsAppClientMessageInput) {
  const firstName = getFirstName(clientName);

  const templates: Record<WhatsAppClientTemplateType, string> = {
    welcome: `Olá, ${firstName}! Tudo bem?\n\nAqui é do ${clinicName}. Seu cadastro foi realizado com sucesso.\n\nSempre que precisar agendar, tirar dúvidas ou remarcar um horário, pode nos chamar por aqui.`,
    birthday: `Olá, ${firstName}! Tudo bem?\n\nHoje é um dia especial e o ${clinicName} deseja a você um feliz aniversário.\n\nQue seu novo ciclo seja leve, bonito e cheio de boas conquistas.`,
    returnInvite: `Olá, ${firstName}! Tudo bem?\n\nPassando para saber como você está e deixar o convite para programarmos seu próximo atendimento no ${clinicName}.\n\nQuando quiser, me chama por aqui para vermos o melhor horário.`,
    reactivation: `Olá, ${firstName}! Tudo bem?\n\nFaz um tempinho que não nos vemos no ${clinicName}. Passando para saber como você está e se deseja agendar uma nova avaliação ou retorno.\n\nPosso te ajudar por aqui.`,
    postCare: `Olá, ${firstName}! Tudo bem?\n\nPassando para saber como você ficou após seu atendimento no ${clinicName}.\n\nSe tiver qualquer dúvida, pode me chamar por aqui.`,
  };

  return templates[template];
}


export function buildMarketingWhatsAppMessage({
  template,
  leadName,
  interest,
  clinicName = "Studio Realçar",
}: WhatsAppMarketingMessageInput) {
  const firstName = getFirstName(leadName);
  const interestText = interest ? ` sobre ${interest}` : "";

  const templates: Record<WhatsAppMarketingTemplateType, string> = {
    firstContact: `Olá, ${firstName}! Tudo bem?\n\nAqui é do ${clinicName}. Recebemos seu contato${interestText} e posso te ajudar por aqui.\n\nVocê prefere que eu te explique as opções ou que eu veja um horário para avaliação?`,
    evaluationInvite: `Olá, ${firstName}! Tudo bem?\n\nPara te orientar melhor${interestText}, o ideal é fazermos uma avaliação no ${clinicName}.\n\nPosso verificar alguns horários disponíveis para você?`,
    promotion: `Olá, ${firstName}! Tudo bem?\n\nPassando para te avisar que o ${clinicName} está com uma condição especial${interestText}.\n\nSe fizer sentido para você, posso te enviar os detalhes e horários disponíveis.`,
    followUp: `Olá, ${firstName}! Tudo bem?\n\nPassando para retomar nossa conversa${interestText}.\n\nFicou alguma dúvida ou quer que eu veja um horário para você no ${clinicName}?`,
    reactivationLead: `Olá, ${firstName}! Tudo bem?\n\nFaz um tempo que conversamos${interestText} e passei para saber se ainda deseja avaliar esse cuidado no ${clinicName}.\n\nPosso te ajudar por aqui quando quiser.`,
  };

  return templates[template];
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const normalizedPhone = normalizeBrazilianPhone(phone);
  const encodedMessage = encodeURIComponent(message);

  if (!normalizedPhone) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}
