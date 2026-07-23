export type PerguntaModeloStudio = {
  pergunta: string;
  tipo: "SECAO" | "SIM_NAO" | "TEXTO_CURTO" | "TEXTO_LONGO" | "MULTIPLA_ESCOLHA" | "MULTIPLA_SELECAO" | "ACEITE" | "NUMERO";
  opcoes?: string[];
  obrigatoria?: boolean;
};

export type ModeloAnamneseStudio = {
  procedimentoNome: string;
  aliases?: string[];
  descricao: string;
  perguntas: PerguntaModeloStudio[];
};

const secao = (pergunta: string): PerguntaModeloStudio => ({ pergunta, tipo: "SECAO" });
const simNao = (pergunta: string, obrigatoria = true): PerguntaModeloStudio => ({ pergunta, tipo: "SIM_NAO", obrigatoria });
const texto = (pergunta: string, obrigatoria = false): PerguntaModeloStudio => ({ pergunta, tipo: "TEXTO_CURTO", obrigatoria });
const textoLongo = (pergunta: string, obrigatoria = false): PerguntaModeloStudio => ({ pergunta, tipo: "TEXTO_LONGO", obrigatoria });
const numero = (pergunta: string, obrigatoria = false): PerguntaModeloStudio => ({ pergunta, tipo: "NUMERO", obrigatoria });
const unica = (pergunta: string, opcoes: string[], obrigatoria = false): PerguntaModeloStudio => ({ pergunta, tipo: "MULTIPLA_ESCOLHA", opcoes, obrigatoria });
const multipla = (pergunta: string, opcoes: string[], obrigatoria = false): PerguntaModeloStudio => ({ pergunta, tipo: "MULTIPLA_SELECAO", opcoes, obrigatoria });

const IMAGEM: PerguntaModeloStudio[] = [
  secao("Uso de imagem"),
  simNao("Autoriza o registro de imagens para documentação clínica?", false),
  simNao("Autoriza o uso de imagens para divulgação, conforme termo específico de autorização de imagem?", false),
];

const OBSERVACOES: PerguntaModeloStudio[] = [
  secao("Observações"),
  textoLongo("Observações gerais", false),
];

export const MODELOS_ANAMNESE_STUDIO: ModeloAnamneseStudio[] = [
  {
    procedimentoNome: "Radiofrequência",
    aliases: ["Radio Frequencia", "Radiofrequencia"],
    descricao: "Ficha clínica de radiofrequência, organizada para preenchimento rápido em celular.",
    perguntas: [
      secao("Objetivo e área de tratamento"),
      texto("Objetivo principal do tratamento"),
      multipla("Áreas a serem tratadas", ["Rosto", "Abdômen", "Braços", "Coxas", "Glúteos", "Outra"], true),
      multipla("Finalidade do tratamento", ["Rejuvenescimento", "Redução de flacidez", "Estímulo de colágeno", "Tratamento de celulite", "Outra"], true),
      secao("Histórico de saúde"),
      simNao("Possui doenças cardiovasculares?"), simNao("Possui hipertensão?"), simNao("Possui diabetes?"), simNao("Possui epilepsia ou histórico de convulsões?"),
      simNao("Possui doença de pele, como rosácea, psoríase ou dermatite?"), simNao("Possui histórico de câncer?"), simNao("Possui varizes ou problemas circulatórios?"), simNao("Possui distúrbios hormonais?"),
      simNao("Possui outra condição de saúde relevante?", false), simNao("Possui marcapasso ou implantes metálicos?"), simNao("Faz uso de medicamentos?"), simNao("Está grávida ou amamentando?"), simNao("Possui alergias ou sensibilidade na pele?"), simNao("Já apresentou reação em tratamentos estéticos anteriores?"),
      secao("Estilo de vida"), simNao("Fuma?", false), simNao("Consome bebidas alcoólicas com frequência?", false), simNao("Pratica atividade física regularmente?", false),
      secao("Avaliação da área"), unica("Presença de flacidez", ["Leve", "Moderada", "Intensa"]), multipla("Características da pele", ["Normal", "Ressecada", "Oleosa", "Sensível"]), simNao("Apresenta sensibilidade ou dor ao toque na área?"), simNao("Possui cicatrizes, lesões ou feridas abertas na área?"),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Eletroestimulação",
    descricao: "Ficha de eletroestimulação com foco em triagem clínica, objetivo e área de tratamento.",
    perguntas: [
      secao("Triagem clínica"), simNao("Possui marcapasso ou implantes metálicos?"), simNao("Tem lesão, ferida ou infecção na área a ser tratada?"), simNao("Está grávida ou amamentando?"), simNao("Possui condição cardíaca ou pressão arterial descontrolada?"),
      simNao("Possui problemas neuromusculares ou osteomusculares relevantes?"), simNao("Possui diabetes?"), simNao("Apresenta epilepsia ou histórico de convulsões?"), simNao("Possui trombose ou problemas circulatórios?"), simNao("Faz uso de medicamentos?"), simNao("Possui alergia ou sensibilidade na pele?"), simNao("Realizou cirurgia recente?"), simNao("Já teve reação adversa a tratamento estético anterior?"),
      secao("Objetivo e área"), multipla("Objetivo do tratamento", ["Tonificação muscular", "Redução de flacidez muscular", "Redução de medidas", "Fibrose", "Outro"], true), multipla("Área a ser tratada", ["Abdômen", "Glúteos", "Coxas", "Braços", "Outra"], true),
      secao("Hábitos"), simNao("Pratica exercícios físicos regularmente?", false), simNao("Mantém alimentação equilibrada?", false), texto("Consumo aproximado de água por dia", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Facial",
    descricao: "Ficha facial geral com histórico, hábitos e avaliação básica da pele.",
    perguntas: [
      secao("Histórico e hábitos"), simNao("Utiliza lentes de contato?", false), simNao("Possui epilepsia ou histórico de convulsões?"), simNao("Funcionamento intestinal é regular?", false), simNao("Já realizou tratamento facial anteriormente?", false), simNao("Ingere água com frequência?", false), simNao("Consome bebida alcoólica?", false), simNao("Possui exposição frequente ao sol?", false), simNao("Está no período menstrual?", false), simNao("Considera boa a qualidade do sono?", false), simNao("Possui prótese corporal ou facial?"), simNao("Fuma?", false), simNao("Possui alterações cardíacas?"), simNao("Possui marcapasso?"), simNao("Está grávida?"), simNao("Utiliza cremes ou loções faciais?", false), simNao("Pratica atividade física?", false), simNao("Utiliza anticoncepcional?", false), simNao("Possui alergias?"), simNao("Mantém alimentação equilibrada?", false), simNao("Possui problemas de pele?"), textoLongo("Existe outro problema ou informação que considere importante?", false),
      secao("Avaliação da pele"), unica("Oleosidade", ["Alípica", "Lipídica", "Normal", "Seborreica"]), unica("Grau de acne", ["Sem acne", "Grau I", "Grau II", "Grau III", "Grau IV"]), unica("Espessura", ["Espessa", "Fina", "Muito fina"]), unica("Hidratação", ["Hidratada", "Normal", "Desidratada"]), unica("Fototipo", ["I", "II", "III", "IV", "V", "VI"]),
      multipla("Problemas identificados", ["Milium", "Comedão", "Pápula", "Pústula", "Cistos", "Hipertricose", "Ptose", "Rugas", "Acromia", "Hipercromia", "Foliculite", "Queratose", "Cicatriz", "Atrofia", "Xantelasma", "Quelóide", "Tumor", "Nevo vascular", "Nevo melanocítico", "Verruga", "Papiloma", "Efélides", "Bolhas", "Abscesso", "Hirsutismo", "Nódulos", "Víbices", "Telangiectasias", "Hipocromia", "Marcas", "Outra"]),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Despigmentação micropigmentação ND YAG",
    aliases: ["Despigmentação micropigmentação ND:YAG", "Despigmentacao micropigmentacao ND YAG"],
    descricao: "Ficha para avaliação de despigmentação de micropigmentação com ND:YAG.",
    perguntas: [
      secao("Histórico da micropigmentação"), texto("Há quanto tempo possui a micropigmentação?", true), simNao("Já realizou mais de uma sessão de micropigmentação?", false), simNao("Sabe qual pigmento foi utilizado?", false), simNao("A cor atual está diferente do esperado, como acinzentada, azulada ou avermelhada?", false), simNao("Já tentou clarear ou remover essa micropigmentação?", false), simNao("Já fez uso de ácidos ou despigmentantes na região?"), simNao("Já realizou laser anteriormente na sobrancelha?", false),
      secao("Pele e saúde"), simNao("A região está sensível ou irritada?"), simNao("A pele costuma manchar com facilidade?", false), simNao("Já teve queloide ou cicatriz hipertrófica?"), simNao("Possui doença crônica?"), simNao("Faz uso contínuo de medicamentos?"), simNao("Fez uso de isotretinoína nos últimos 6 meses?"), simNao("Está grávida ou amamentando?"), simNao("Já teve herpes na região facial?"), simNao("Possui doença de pele ativa?"), simNao("Faz uso de ácidos atualmente?"),
      secao("Exposição solar"), simNao("Expõe-se ao sol com frequência?", false), simNao("Usa protetor solar diariamente?", false), simNao("Trabalha exposto ao sol?", false), unica("Fototipo cutâneo", ["I", "II", "III", "IV", "V", "VI"], true),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Ultrassom microfocado",
    aliases: ["Ultrasom microfocado"],
    descricao: "Ficha de ultrassom microfocado com triagem clínica e expectativas do paciente.",
    perguntas: [
      secao("Histórico de saúde"), simNao("Possui doença crônica, como diabetes ou hipertensão?"), simNao("Faz uso de medicamentos contínuos?"), simNao("Possui doença autoimune?"), simNao("Possui histórico de câncer?"), simNao("Possui problemas de cicatrização?"),
      secao("Condições da pele e procedimentos prévios"), simNao("Possui infecção ativa na pele, como herpes ou acne inflamada?"), simNao("Possui sensibilidade excessiva na pele?"), simNao("Realizou procedimento estético recente na região?"), simNao("Já realizou ultrassom microfocado anteriormente?", false), simNao("Já realizou cirurgia na área a ser tratada?"),
      secao("Condições relevantes"), simNao("Está grávida ou amamentando?"), simNao("Possui marcapasso ou implantes eletrônicos?"), simNao("Possui prótese metálica na região?"), simNao("Possui distúrbio de coagulação?"),
      secao("Expectativas"), multipla("O que deseja melhorar?", ["Flacidez", "Efeito lifting", "Linhas de expressão", "Outra"], true), simNao("Trabalha com exposição solar frequente?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Laser",
    descricao: "Ficha de laser com histórico de saúde, medicamentos, exposição solar e avaliação da área.",
    perguntas: [
      secao("Histórico de saúde"), simNao("Está grávida ou amamentando?"), simNao("Possui doença de pele?"), simNao("Possui histórico de queloide?"), simNao("Possui doença autoimune?"), simNao("Possui diabetes?"), simNao("Faz uso de medicamentos contínuos?"), simNao("Já teve câncer de pele?"),
      secao("Medicações e tratamentos"), simNao("Está usando ácidos na pele?"), simNao("Fez uso de isotretinoína nos últimos 6 meses?"), simNao("Está usando antibióticos?"), simNao("Faz tratamento dermatológico atualmente?"),
      secao("Exposição solar"), simNao("Tomou sol recentemente, nos últimos 7 dias?"), simNao("Está com a pele bronzeada?"), simNao("Usa protetor solar diariamente?", false), simNao("Trabalha exposto ao sol?", false),
      secao("Histórico estético"), simNao("Já realizou tratamento a laser antes?", false), simNao("Já teve reação adversa a procedimento estético?"), simNao("Realizou procedimento estético recente?"),
      secao("Condições da pele e área"), simNao("Possui melasma?", false), simNao("Possui manchas escuras?", false), simNao("Possui rosácea?"), simNao("Possui acne ativa?"), simNao("Possui sensibilidade na pele?"), simNao("Há feridas ou lesões na área a ser tratada?"), simNao("Existe infecção ativa na área?"), simNao("Possui tatuagem na área?"), simNao("A área já foi tratada anteriormente?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Criolipólise",
    aliases: ["Criolipolise"],
    descricao: "Ficha de criolipólise com triagem de saúde, objetivo e áreas de interesse.",
    perguntas: [
      secao("Histórico de saúde"), simNao("Possui problema de saúde diagnosticado?"), simNao("Faz uso contínuo de medicamento?"), simNao("Possui alergias conhecidas?"), simNao("Já realizou cirurgia?", false), simNao("Possui marcapasso, prótese metálica ou implante eletrônico?"), simNao("Possui problema cardíaco ou pressão arterial descontrolada?"), simNao("Possui problema de coagulação ou faz uso de anticoagulante?"), simNao("Possui varizes, flebite ou histórico de trombose?"), simNao("Possui diabetes?"), simNao("Possui alteração de sensibilidade ao frio ou calor?"), simNao("Está grávida ou amamentando?"), simNao("Possui histórico de epilepsia ou convulsões?"), simNao("Possui lesão, ferida aberta, dermatite ou infecção na área a ser tratada?"), simNao("Já realizou procedimento estético na região tratada?", false),
      secao("Objetivo e área"), multipla("Principais objetivos do tratamento", ["Redução de gordura localizada", "Melhora da flacidez", "Melhora da celulite", "Outro"], true), multipla("Área de interesse", ["Abdômen", "Flancos", "Coxas", "Glúteos", "Braços", "Face/Papada", "Outra"], true),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Drenagem corporal",
    descricao: "Ficha de drenagem corporal com histórico de saúde, hábitos e objetivos.",
    perguntas: [
      secao("Histórico de saúde"), simNao("Possui doença diagnosticada?"), simNao("Usa medicamentos contínuos?"), simNao("Possui problemas de pressão alta ou baixa?"), simNao("Possui problema circulatório ou varizes?"), simNao("Possui histórico ou risco de trombose?"), simNao("Possui insuficiência renal ou hepática?"), simNao("Possui ou teve câncer?"), simNao("Possui doença autoimune?"), simNao("Possui diabetes?"), simNao("Possui condição cardíaca?"), simNao("Possui alergia?"), simNao("Está grávida ou amamentando?"), simNao("Está em pós-operatório recente?"),
      secao("Hábitos e sintomas"), simNao("Bebe água regularmente?", false), simNao("Mantém alimentação equilibrada?", false), simNao("Pratica atividade física?", false), simNao("Sofre com retenção de líquido?", false), simNao("Sente dores ou inchaços em alguma parte do corpo?", false), simNao("Possui prisão de ventre?", false),
      secao("Objetivo do tratamento"), multipla("Objetivos", ["Redução de inchaço", "Pós-operatório", "Estética corporal", "Estímulo à circulação", "Relaxamento", "Redução de celulite", "Outro"], true),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Fios de PDO Liso",
    aliases: ["Fios de PDO liso"],
    descricao: "Ficha para fios de PDO liso com histórico de saúde, avaliação e áreas de interesse.",
    perguntas: [
      secao("Histórico de saúde"), simNao("Está em acompanhamento médico?"), simNao("Faz uso contínuo de medicamentos?"), simNao("Possui alergias?"), simNao("Já realizou cirurgia facial ou corporal?", false), simNao("Possui doença crônica?"), simNao("Possui tendência a queloide ou cicatrização hipertrófica?"), simNao("Possui herpes labial ou facial recorrente?"), simNao("Já realizou procedimento com fios de PDO?", false), simNao("Consome bebida alcoólica com frequência?", false), simNao("Fuma?", false),
      secao("Avaliação estética"), multipla("Motivo da escolha do tratamento", ["Linhas de expressão", "Cicatriz hipertrófica", "Flacidez", "Rejuvenescimento", "Outro"], true), multipla("Áreas de interesse para aplicação", ["Testa", "Sobrancelhas", "Malar", "Sulco nasolabial", "Linha da mandíbula", "Pescoço", "Glabela", "Outra"], true), unica("Tipo de pele", ["Normal", "Oleosa", "Mista", "Seca", "Sensível"]),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "PEIM",
    descricao: "Ficha PEIM com histórico médico, avaliação da região e orientações registradas.",
    perguntas: [
      secao("Histórico médico"), simNao("Possui doença crônica?"), simNao("Faz uso de medicamentos contínuos?"), simNao("Possui alergia a substância ou medicamento?"), simNao("Já realizou cirurgia?", false), simNao("Possui histórico familiar de trombose ou varizes?"), simNao("Apresenta problema circulatório, como insuficiência venosa ou má circulação?"), simNao("Possui tendência a queloides ou cicatrização hipertrófica?"), simNao("Possui diabetes?"), simNao("Possui hipertensão?"), simNao("Possui distúrbio de coagulação sanguínea?"), simNao("Fuma?", false), simNao("Consome bebida alcoólica?", false), simNao("Está grávida ou amamentando?"),
      secao("Histórico estético e hábitos"), simNao("Já realizou PEIM anteriormente?", false), simNao("Teve reação adversa em procedimento anterior?"), simNao("Faz uso de anticoagulante ou anti-inflamatório?"), simNao("Possui exposição frequente ao sol?", false), simNao("Pratica atividade física regularmente?", false), simNao("Bebe pelo menos 2 litros de água por dia?", false),
      secao("Avaliação da região"), multipla("Região afetada", ["Pernas", "Coxas", "Outra"], true), multipla("Cor das microvarizes", ["Roxas", "Azuladas", "Avermelhadas", "Outra"]), simNao("Possui sensibilidade na área?", false), simNao("Possui inchaço nas pernas?", false), simNao("Sente peso ou cansaço nas pernas?", false), texto("Pressão arterial", false),
      secao("Orientações registradas"), textoLongo("Orientações pré-procedimento fornecidas", false), textoLongo("Orientações pós-procedimento fornecidas", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Preenchimento com Ácido Hialurônico",
    aliases: ["Preenchimento", "Preenchimento com ácido Hialurônico", "Preenchimento com ácido hialurônico"],
    descricao: "Ficha de preenchimento com ácido hialurônico, estruturada para triagem e histórico estético.",
    perguntas: [
      secao("Identificação complementar"), texto("Profissão", false),
      secao("Histórico médico"), simNao("Possui alergia a medicamento?"), simNao("Já teve reação alérgica a anestésico local, como lidocaína?"), simNao("Faz uso de medicamento atualmente, incluindo AAS ou anticoagulantes?"), simNao("Possui doença autoimune?"), simNao("Possui histórico de herpes labial recorrente?"), simNao("Está grávida ou amamentando?"), simNao("Possui condição médica que possa interferir na cicatrização?"), simNao("Já teve reação adversa a procedimento estético?"),
      secao("Hábitos e cuidados"), simNao("Fuma?", false), simNao("Consome bebida alcoólica?", false), simNao("Bebe água regularmente?", false), simNao("Usa cosméticos nos lábios ou região da face?", false),
      secao("Histórico estético"), simNao("Já realizou preenchimento anteriormente?", false), simNao("Já realizou outro procedimento estético, como toxina botulínica, bioestimulador ou fios?", false), texto("Data aproximada do último procedimento estético", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Toxina Botulínica",
    aliases: ["Botox", "Toxina botulinica"],
    descricao: "Ficha para toxina botulínica com triagem clínica e histórico de aplicações.",
    perguntas: [
      secao("Histórico de saúde"), simNao("Possui condição de saúde diagnosticada?"), simNao("Faz uso de medicamentos?"), simNao("Possui alergias?"), simNao("Está em tratamento médico atualmente?"), simNao("Já realizou tratamento com toxina botulínica?", false), simNao("Possui doença autoimune ou neuromuscular?"), simNao("Está grávida ou amamentando?"), simNao("Possui sensibilidade ou reação adversa a anestésico local?"), simNao("Fuma?", false), simNao("Consome álcool com frequência?", false), simNao("Apresenta alteração de pele na área da aplicação?"),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Auriculoterapia",
    aliases: ["Auricoloterapia"],
    descricao: "Ficha de auriculoterapia com objetivos, sintomas, hábitos e histórico de saúde.",
    perguntas: [
      secao("Objetivos"), multipla("Principal objetivo com a auriculoterapia", ["Aliviar dores musculares ou articulares", "Reduzir estresse ou ansiedade", "Melhorar qualidade do sono", "Auxiliar no controle de peso ou compulsão alimentar", "Auxiliar em condições digestivas", "Outro"], true),
      secao("Sintomas e bem-estar"), unica("Nível de estresse no dia a dia", ["Alto", "Moderado", "Baixo"], true), multipla("Sintomas atuais", ["Dor de cabeça ou enxaqueca", "Dores musculares ou articulares", "Insônia ou dificuldade para dormir", "Cansaço ou fadiga", "Alterações digestivas", "Outro"]),
      secao("Histórico de saúde"), multipla("Condições diagnosticadas", ["Hipertensão", "Diabetes", "Alterações hormonais", "Depressão", "Ansiedade", "Outra"]), unica("Está em tratamento médico ou usa medicamentos?", ["Sim, uso contínuo", "Sim, tratamento esporádico", "Não"], true), textoLongo("Especifique tratamento ou medicamentos, se aplicável", false),
      secao("Sono, alimentação e rotina"), unica("Qualidade do sono", ["Durmo bem e acordo descansado(a)", "Tenho dificuldade para dormir ou acordo durante a noite", "Durmo, mas não sinto descanso adequado"]), unica("Apetite e hábitos alimentares", ["Regular e equilibrado", "Compulsão ou exageros em alguns momentos", "Falta de apetite ou alimentação irregular", "Outro"]), unica("Rotina de atividade física", ["Regular, 3 vezes por semana ou mais", "Ocasional", "Não pratico atualmente"]), multipla("Histórico emocional ou psicológico", ["Ansiedade", "Depressão", "Estresse pós-traumático", "Nenhum", "Outro"]),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Microlabial",
    descricao: "Ficha de microlabial com objetivo, alergias, histórico de herpes e avaliação dos lábios.",
    perguntas: [
      secao("Objetivo"), multipla("Objetivo com a microlabial", ["Revitalizar o tom dos lábios", "Realçar o contorno natural", "Suavizar assimetrias", "Efeito batom", "Neutralizar a cor dos lábios", "Outro"], true),
      secao("Histórico"), unica("Já realizou micropigmentação antes?", ["Sim, há menos de 1 ano", "Sim, há mais de 1 ano", "Não"], true), multipla("Possui alergia conhecida?", ["Pigmentos ou tintas", "Anestésicos tópicos", "Outra", "Nenhuma"]), unica("Histórico de herpes labial", ["Frequente, mais de 4 vezes ao ano", "Raro, menos de 4 vezes ao ano", "Nunca"]), multipla("Faz uso de medicação atualmente?", ["Antiviral", "Anticoagulante", "Outra", "Não"]), simNao("Está em tratamento médico ou possui condição de saúde?"), simNao("Possui diabetes?"), simNao("Possui hipertensão?"), simNao("Está grávida ou amamentando?"), simNao("Fuma?", false), simNao("Consome bebida alcoólica regularmente?", false),
      secao("Avaliação dos lábios"), unica("Tom atual dos lábios", ["Claro e uniforme", "Escuro ou hiperpigmentado", "Rosado natural", "Outro"]),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Limpeza de pele",
    descricao: "Ficha de limpeza de pele com histórico de saúde, rotina de skincare e fototipo.",
    perguntas: [
      secao("Identificação e objetivo"), texto("Profissão", false), textoLongo("Motivo da busca pela limpeza de pele", true),
      secao("Histórico de saúde"), simNao("Possui alergias?"), simNao("Faz uso de medicamentos?"), simNao("Possui doença de pele, como rosácea, acne ou melasma?"), simNao("Possui alguma condição de saúde relevante, como diabetes ou hipertensão?"),
      secao("Cuidados com a pele"), simNao("Mantém rotina de skincare?", false), textoLongo("Quais produtos usa na pele?", false), simNao("Possui sensibilidade a cosméticos ou produtos?"), unica("Fototipo", ["I", "II", "III", "IV", "V", "VI"], true), simNao("Realizou algum procedimento estético recentemente?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Intradermoterapia",
    descricao: "Ficha de intradermoterapia com queixa, histórico de saúde, hábitos e condições relevantes.",
    perguntas: [
      secao("Motivo da consulta"), multipla("Principal queixa", ["Flacidez", "Melasma", "Estrias", "Celulite", "Gordura localizada", "Queda de cabelo", "Olheiras", "Acne", "Envelhecimento cutâneo", "Melhora do aspecto cutâneo", "Outro"], true),
      secao("Histórico de saúde"), simNao("Possui doença crônica ou condição de saúde?"), simNao("Possui diabetes?"), simNao("Possui hipertensão arterial?"), simNao("Possui doença autoimune?"), simNao("Possui insuficiência renal ou hepática?"), simNao("Possui doença cardiovascular?"), simNao("Possui alergias?"), simNao("Faz uso contínuo de medicamentos?"), simNao("Possui alergia a medicamentos, substâncias ou alimentos?"), simNao("Já realizou cirurgia?", false),
      secao("Estilo de vida"), simNao("Pratica atividade física?", false), texto("Consumo aproximado de água por dia", false), unica("Alimentação", ["Balanceada", "Rica em alimentos industrializados", "Irregular", "Outra"]), simNao("Fuma?", false), simNao("Consome bebidas alcoólicas?", false),
      secao("Condições relevantes"), simNao("Possui infecção ativa na área a ser tratada?"), simNao("Possui histórico de câncer ou tratamento oncológico?"), simNao("Possui epilepsia ou histórico de convulsões?"), simNao("Já teve reação adversa a anestésico ou fármaco?"), simNao("Possui distúrbio de coagulação ou usa anticoagulante?"), simNao("Possui herpes ativa ou recorrente?"), simNao("Possui doença reumatológica, como lúpus ou artrite reumatoide?"),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Hidratação facial",
    descricao: "Ficha de hidratação facial com queixa, histórico, hábitos e estado atual da pele.",
    perguntas: [
      secao("Queixa principal"), multipla("Principal insatisfação com a pele", ["Ressecamento", "Aspecto opaco", "Sensação de repuxamento", "Descamação", "Outra"], true), simNao("Já realizou procedimentos anteriormente?", false),
      secao("Histórico de saúde"), simNao("Possui doença crônica?"), simNao("Faz uso de medicamentos contínuos?"), simNao("Possui alergias conhecidas?"), simNao("Já realizou tratamento na área facial?", false),
      secao("Hábitos e estilo de vida"), simNao("Usa protetor solar?", false), texto("FPS utilizado", false), simNao("Mantém rotina de skincare?", false), textoLongo("Produtos usados na rotina de skincare", false), simNao("Fuma?", false), simNao("Consome bebida alcoólica?", false), unica("Consumo de água", ["Menos de 1 litro/dia", "Entre 1 e 2 litros/dia", "Mais de 2 litros/dia"]),
      secao("Estado da pele"), multipla("Estado da pele no momento", ["Ressecada", "Com descamação", "Vermelhidão", "Áreas ásperas ao toque", "Outra"], true), simNao("Está grávida ou amamentando?"), simNao("Possui contraindicação ou recomendação médica para uso de ativos na pele?"), simNao("Já teve reação alérgica com máscara ou produto tópico?"),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Protocolo clareamento",
    aliases: ["Protocolo de clareamento"],
    descricao: "Ficha de protocolo de clareamento com avaliação de manchas, exposição solar e fatores hormonais.",
    perguntas: [
      secao("Queixa principal"), multipla("Principal insatisfação relacionada à pele", ["Manchas escuras", "Tons desiguais", "Melasma", "Pós-acne", "Outra"], true), unica("Há quanto tempo percebe o problema?", ["Menos de 6 meses", "Entre 6 meses e 1 ano", "Mais de 1 ano", "Não sei"]), simNao("Já realizou tratamentos anteriores?", false),
      secao("Histórico de saúde"), simNao("Possui doença crônica?"), simNao("Faz uso de medicamentos contínuos?"), simNao("Possui alergias conhecidas?"), simNao("Está grávida ou amamentando?"),
      secao("Hábitos e estilo de vida"), simNao("Usa protetor solar?", false), texto("FPS utilizado", false), simNao("Fuma?", false), simNao("Consome bebida alcoólica?", false), simNao("Teve exposição solar recente?"), simNao("Mantém rotina de skincare?", false), textoLongo("Produtos usados na rotina de skincare", false),
      secao("Características das manchas"), multipla("Tipo de mancha", ["Melasma", "Hiperpigmentação pós-acne", "Sardas ou efélides", "Manchas solares", "Outra"], true), multipla("Localização e extensão", ["Rosto", "Corpo", "Ambos"], true), simNao("Observa piora em períodos específicos?", false),
      secao("Fatores hormonais"), simNao("Está em tratamento hormonal ou usa contraceptivo?", false), simNao("Teve gravidez recente ou alterações menstruais?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Protocolo secativo",
    descricao: "Ficha de protocolo secativo para oleosidade e acne, com histórico e rotina de cuidados.",
    perguntas: [
      secao("Queixa principal"), multipla("Motivo da busca pelo tratamento secativo", ["Controle de oleosidade", "Redução da acne ativa", "Melhora da textura da pele", "Outro"], true),
      secao("Histórico de saúde"), simNao("Possui alergias?"), simNao("Faz uso de medicamentos atualmente?"), simNao("Faz ou já fez uso de isotretinoína?"), multipla("Condições de saúde", ["Diabetes", "Hipertensão", "Doença autoimune ou imunossupressão", "Alteração hormonal, como síndrome dos ovários policísticos", "Outra", "Nenhuma"]), simNao("Está grávida ou amamentando?"),
      secao("Cuidados com a pele"), simNao("Mantém rotina de skincare?", false), textoLongo("Quais produtos usa?", false), simNao("Usa protetor solar diariamente?", false), texto("FPS utilizado", false), simNao("Já fez tratamento estético para acne ou oleosidade?", false), simNao("Usa maquiagem com frequência?", false), simNao("Teve exposição solar recente?"), textoLongo("Há algo na rotina que possa influenciar a condição da pele, como dieta, estresse ou uso de produtos?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Endermoterapia facial ou corporal",
    descricao: "Ficha de endermoterapia facial ou corporal com objetivo, histórico e áreas tratadas.",
    perguntas: [
      secao("Queixa principal"), multipla("Motivo da busca pela endermoterapia", ["Rejuvenescimento facial", "Redução de gordura localizada", "Melhora da celulite", "Tratamento de estrias", "Melhora da circulação", "Outro"], true),
      secao("Histórico de saúde"), simNao("Possui alergias?"), simNao("Faz uso de medicamentos?"), simNao("Está grávida ou amamentando?"), simNao("Possui doença cardíaca?"), simNao("Possui problema circulatório, como varizes ou trombose?"), simNao("Possui diabetes?"), simNao("Possui hipertensão?"), simNao("Possui doença de pele, como acne, rosácea ou dermatite?"), simNao("Possui imunossupressão ou doença autoimune?"), simNao("Possui queloide ou cicatrização hipertrófica?"), simNao("Possui doença grave ou condição aguda?"),
      secao("Estilo de vida"), simNao("Usa protetor solar diariamente?", false), simNao("Pratica atividade física?", false), simNao("Mantém hábitos alimentares equilibrados?", false), simNao("Teve exposição solar recente?", false), simNao("Fuma?", false), simNao("Consome bebida alcoólica?", false), simNao("Já realizou tratamento estético anteriormente?", false),
      secao("Área e avaliação"), multipla("Área a ser tratada", ["Rosto", "Abdômen", "Coxas", "Glúteos", "Braços", "Outra"], true), multipla("Sinais ou condições presentes", ["Celulite", "Gordura localizada", "Flacidez", "Estrias", "Linhas finas ou rugas", "Outro"]), unica("Nível de satisfação atual com corpo ou pele", ["Muito insatisfeito(a)", "Insatisfeito(a)", "Neutro", "Satisfeito(a)", "Muito satisfeito(a)"]),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Ultrassom facial ou corporal",
    aliases: ["Ultrasom facial ou corporal"],
    descricao: "Ficha de ultrassom facial ou corporal com triagem clínica e estilo de vida.",
    perguntas: [
      secao("Queixa principal"), multipla("Motivo da busca pelo ultrassom", ["Rejuvenescimento facial", "Redução de celulite", "Redução de gordura localizada", "Outro"], true),
      secao("Histórico de saúde"), simNao("Possui alergias?"), simNao("Faz uso de medicamentos?"), simNao("Possui doença de pele ou sensibilidade?"), simNao("Está grávida ou amamentando?"), simNao("Possui hepatopatia?"), simNao("Possui dislipidemia?"), simNao("Possui insuficiência renal?"), simNao("Possui labirintite?"), simNao("Possui ou teve câncer?"), simNao("Possui infecção ativa?"), simNao("Possui histórico de trombose?"), simNao("Possui marcapasso cardíaco?"), simNao("Possui DIU?"), simNao("Possui diabetes?"), simNao("Possui hipertensão?"), simNao("Possui problema circulatório?"), simNao("Possui queloide ou cicatrização hipertrófica?"), simNao("Possui hérnia abdominal ou problema similar?"), simNao("Possui imunossupressão ou doença autoimune?"),
      secao("Cuidados e estilo de vida"), simNao("Usa protetor solar diariamente?", false), simNao("Teve exposição recente ao sol?", false), simNao("Pratica atividade física regularmente?", false), simNao("Mantém alimentação equilibrada?", false), simNao("Já realizou tratamento estético anteriormente?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Microagulhamento",
    descricao: "Ficha de microagulhamento com objetivo, histórico de saúde e cuidados diários.",
    perguntas: [
      secao("Queixa principal"), multipla("Motivo da busca pelo microagulhamento", ["Rejuvenescimento facial ou corporal", "Tratamento de cicatrizes", "Redução de manchas, melasma ou hiperpigmentação", "Melhora da textura da pele", "Redução de rugas ou linhas de expressão", "Redução de poros dilatados", "Outro"], true),
      secao("Histórico de saúde"), simNao("Possui alergias?"), simNao("Faz uso de medicamentos?"), simNao("Possui doença de pele ou sensibilidade?"), simNao("Possui queloide ou cicatrização hipertrófica?"), simNao("Está grávida ou amamentando?"), simNao("Faz uso de ácidos na pele?"), simNao("Realizou procedimento estético recente na região a ser tratada?"), simNao("Possui diabetes?"), simNao("Possui hipertensão?"), simNao("Possui herpes ativa ou recorrente?"), simNao("Possui imunossupressão ou doença autoimune?"),
      secao("Cuidados diários"), simNao("Usa protetor solar diariamente?", false), simNao("Teve exposição recente ao sol?", false), simNao("Mantém rotina de skincare?", false), textoLongo("Produtos usados na rotina de skincare", false), simNao("Pratica atividade física regularmente?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Anamnese Facial",
    aliases: ["Anamenese Facial"],
    descricao: "Avaliação facial técnica com biótipo, acne, alterações cutâneas, fototipo e Glogau.",
    perguntas: [
      secao("Queixa e localização"), textoLongo("Queixa principal", true), texto("Local da queixa principal", false),
      secao("Avaliação da pele"), unica("Biótipo", ["Normal", "Seca", "Oleosa", "Mista", "Sensível"], true), texto("Tipo de sensibilidade, se aplicável", false), unica("Textura da pele", ["Lisa", "Áspera"]), unica("Acne", ["Sem acne", "Grau I", "Grau II", "Grau III", "Grau IV"]),
      multipla("Alterações na pele", ["Comedões", "Foliculite", "Pápulas", "Pústulas", "Milium", "Cistos", "Nódulo", "Vesícula", "Abscesso", "Rosácea", "Dermatite seborreica", "Dermatite de contato", "Dermatite atópica", "Telangiectasias", "Outra"]), texto("Local das alterações, se aplicável", false), unica("Fototipo cutâneo", ["I", "II", "III", "IV", "V", "VI"], true), multipla("Discromias", ["Acromia", "Hipocromia", "Hipercromia", "Nenhuma"]), texto("Local das discromias, se aplicável", false), unica("Classificação de Glogau", ["Tipo I", "Tipo II", "Tipo III", "Tipo IV"]), multipla("Linhas de expressão e flacidez", ["Rugas dinâmicas", "Rugas estáticas", "Elastose", "Flacidez muscular", "Flacidez tissular", "Nenhuma"]), texto("Local das linhas de expressão ou flacidez, se aplicável", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Peeling",
    descricao: "Ficha de peeling com objetivo, rotina de cuidados, exposição solar e histórico estético.",
    perguntas: [
      secao("Objetivo"), multipla("Objetivo principal com o peeling", ["Clarear manchas", "Reduzir rugas e linhas de expressão", "Tratar acne ou cicatrizes de acne", "Melhorar textura e uniformidade", "Rejuvenescer a pele", "Outro"], true),
      secao("Cuidados com a pele"), unica("Frequência de uso de protetor solar", ["Diariamente", "Apenas ao sair ou me expor ao sol", "Raramente ou nunca"], true), multipla("Produtos usados regularmente", ["Hidratantes ou cremes nutritivos", "Ácidos", "Séruns antioxidantes", "Sabonetes ou tônicos específicos", "Outro"]),
      secao("Manchas e exposição"), unica("Histórico de manchas ou melasma", ["Nunca tive manchas", "Manchas pequenas em algumas áreas", "Manchas mais profundas ou melasma", "Outro"]), unica("Exposição ao sol", ["Alta", "Moderada", "Baixa"]),
      secao("Histórico estético"), multipla("Tratamentos estéticos anteriores", ["Peeling", "Microagulhamento", "Laser", "Outro", "Nenhum"]), multipla("Principal preocupação com o peeling", ["Resultado eficaz e visível", "Minimizar desconforto", "Evitar irritação ou descamação excessiva", "Saber cuidar da pele após o tratamento", "Outra"]),
      secao("Histórico de saúde"), simNao("Possui doença ou condição de saúde relevante?"), simNao("Possui alergia?"), simNao("Faz uso contínuo de medicamento?"), simNao("Realizou tratamento estético recentemente?", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Depilação",
    descricao: "Ficha de depilação com triagem de saúde, avaliação da pele, métodos e áreas tratadas.",
    perguntas: [
      secao("Histórico"), simNao("Costuma fazer depilação?", false), simNao("Está fazendo tratamento dermatológico?"), simNao("Possui tumor ou lesão pré-cancerosa diagnosticada?"), simNao("Realizou cirurgia recentemente?", false), simNao("Possui alergia?"), simNao("Possui hipertensão?"), simNao("Possui hipotensão?"), simNao("Possui diabetes?"), simNao("Possui epilepsia ou histórico de convulsões?"), simNao("Possui cardiopatia?"), simNao("Possui problema circulatório?"), simNao("Possui distúrbio hormonal?"), simNao("Está grávida?"), simNao("Está amamentando?"), simNao("Faz uso de medicamento?"), simNao("Está em tratamento médico?"), textoLongo("Existe outro problema ou informação que considere importante?", false),
      secao("Avaliação"), unica("Tipo de pele", ["Normal", "Seca", "Oleosa", "Mista", "Sensível"]), simNao("Possui problema de pele na área?"), simNao("Possui nódulos na área?"), simNao("Possui foliculite?"), simNao("Possui manchas na área?"), multipla("Métodos de depilação já utilizados", ["Cera quente", "Cera fria", "Laser", "Luz pulsada", "Linha", "Outro"]), multipla("Áreas tratadas", ["Axilas", "Peito", "Abdômen", "Braço", "Antebraço", "Virilha", "Coxa", "Perna", "Nádegas", "Íntima", "Costas", "Outra"], true),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Micropigmentação",
    descricao: "Ficha de micropigmentação com triagem de saúde e registro complementar do procedimento.",
    perguntas: [
      secao("Histórico de saúde"), simNao("Possui alergia?"), simNao("Possui ou teve câncer?"), simNao("Possui problema circulatório?"), simNao("Possui hipertensão?"), simNao("Está menstruada?", false), simNao("Possui problema respiratório?"), simNao("Possui hemofilia?"), simNao("Possui diabetes?"), simNao("Está grávida?"), simNao("Faz uso de AAS ou outro medicamento que interfira na coagulação?"), simNao("Possui cardiopatia?"), simNao("Possui herpes ativa ou recorrente?"), simNao("Possui diagnóstico de HIV?"), simNao("Possui problema renal?"), simNao("Possui tatuagem na área?", false), simNao("Possui hepatite?"), simNao("Possui glaucoma?"), simNao("Está amamentando?"), textoLongo("Existe outro problema ou informação que considere importante?", false),
      secao("Registro do procedimento"), texto("Cor do pigmento ou informação complementar", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
  {
    procedimentoNome: "Design de Sobrancelhas",
    aliases: ["Design Sobrancelhas", "Design de sobrancelhas"],
    descricao: "Ficha de design de sobrancelhas com histórico e avaliação das medidas e características faciais.",
    perguntas: [
      secao("Histórico"), simNao("Já realizou design de sobrancelhas anteriormente?", false), simNao("Possui queda de pelos nas sobrancelhas?", false), simNao("Possui alergia a henna, cosméticos ou outros produtos?"), simNao("Está grávida?", false), simNao("Faz uso de medicamento?"), textoLongo("Existe outro problema ou informação que considere importante?", false),
      secao("Avaliação do design"), texto("Espaço entre sobrancelhas", false), texto("Medida complementar entre referências do design", false), texto("Altura inicial", false), texto("Altura central", false), texto("Altura final", false), texto("Ponto inicial", false), texto("Ponto alto", false), texto("Ponto final", false), texto("Cor da henna", false), texto("Espessura das sobrancelhas", false), texto("Formato dos olhos", false), texto("Formato do rosto", false), texto("Tipo de pele", false),
      ...IMAGEM, ...OBSERVACOES,
    ],
  },
];

export function nomeCanonicoAnamnese(nome: string | null | undefined) {
  if (!nome) return nome ?? "";
  const alvo = nome.trim().toLocaleLowerCase("pt-BR");
  const modelo = MODELOS_ANAMNESE_STUDIO.find((item) =>
    [item.procedimentoNome, ...(item.aliases ?? [])].some(
      (valor) => valor.trim().toLocaleLowerCase("pt-BR") === alvo,
    ),
  );
  return modelo?.procedimentoNome ?? nome;
}
