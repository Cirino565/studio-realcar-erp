export const STUDIO_REALCAR_IDENTIDADE = {
  nome: "Studio Realçar",
  responsavel: "Vivian da Silva Cirino",
  whatsappExibicao: "(11) 94641-3388",
  whatsappNumero: "5511946413388",
  logoPublica: "/studio-realcar-logo.png",
} as const;

export const DECLARACAO_ANAMNESE_VERSAO = "LGPD-2026-07-23-v1";

export const DECLARACAO_ANAMNESE_PARAGRAFOS = [
  "Declaro que as informações fornecidas nesta ficha de anamnese são verdadeiras, completas e correspondem ao meu estado atual de saúde, conforme meu conhecimento. Confirmo que revisei as respostas antes da assinatura e que informarei ao profissional qualquer alteração relevante.",
  `O ${STUDIO_REALCAR_IDENTIDADE.nome}, sob responsabilidade de ${STUDIO_REALCAR_IDENTIDADE.responsavel}, realiza o tratamento dos dados pessoais e dos dados relacionados à saúde fornecidos nesta ficha para fins de avaliação, atendimento, registro do histórico, segurança do procedimento e cumprimento de obrigações aplicáveis.`,
  `Declaro que recebi informações claras sobre esse tratamento e que posso solicitar informações, correções ou esclarecimentos pelo WhatsApp ${STUDIO_REALCAR_IDENTIDADE.whatsappExibicao}.`,
  "As autorizações referentes ao registro clínico e à divulgação de imagens serão consideradas exclusivamente conforme as respostas marcadas nesta ficha. A assinatura desta declaração não modifica nem amplia eventual resposta negativa.",
] as const;

export const DECLARACAO_ANAMNESE_TEXTO =
  DECLARACAO_ANAMNESE_PARAGRAFOS.join("\n\n");

export const DECLARACAO_ANAMNESE_LEGADO =
  "Declaro que as informações fornecidas nesta anamnese são verdadeiras e completas conforme meu conhecimento, e confirmo que revisei as respostas antes da assinatura.";
