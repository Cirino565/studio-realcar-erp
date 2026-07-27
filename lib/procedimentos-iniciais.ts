export type ProcedimentoInicial = {
  nome: string;
  duracaoPadrao: number;
  valorPadrao: number;
  custoPadrao: number;
  categoria: string;
  descricao: string | null;
};

export const PROCEDIMENTOS_INICIAIS: readonly ProcedimentoInicial[] = [
  {"nome": "1 Sessão PEIM", "duracaoPadrao": 95, "valorPadrao": 150.0, "custoPadrao": 76.0, "categoria": "Estética", "descricao": null},
  {"nome": "Auriculoterapia", "duracaoPadrao": 60, "valorPadrao": 100.0, "custoPadrao": 45.0, "categoria": "Bem estar", "descricao": null},
  {"nome": "Bioestimulador optimus", "duracaoPadrao": 120, "valorPadrao": 1400.0, "custoPadrao": 450.0, "categoria": "Estética", "descricao": null},
  {"nome": "Bioestimulador Elleva 150", "duracaoPadrao": 120, "valorPadrao": 1650.0, "custoPadrao": 895.0, "categoria": "Estética", "descricao": null},
  {"nome": "Botox Dysport", "duracaoPadrao": 110, "valorPadrao": 850.0, "custoPadrao": 280.0, "categoria": "Estética", "descricao": null},
  {"nome": "Clareamento com intradermoterapia", "duracaoPadrao": 90, "valorPadrao": 150.0, "custoPadrao": 86.0, "categoria": "Estética", "descricao": null},
  {"nome": "Clareamento com dermocosméticos", "duracaoPadrao": 100, "valorPadrao": 135.0, "custoPadrao": 83.47, "categoria": "Estética", "descricao": null},
  {"nome": "Clareamento ND YAG", "duracaoPadrao": 40, "valorPadrao": 190.0, "custoPadrao": 60.0, "categoria": "Laser e despigmentação", "descricao": null},
  {"nome": "Clareamento de olheiras", "duracaoPadrao": 60, "valorPadrao": 135.0, "custoPadrao": 85.8, "categoria": "Estética", "descricao": null},
  {"nome": "Corrente russa", "duracaoPadrao": 60, "valorPadrao": 150.0, "custoPadrao": 18.0, "categoria": "Estética", "descricao": null},
  {"nome": "Criofracionada facial", "duracaoPadrao": 30, "valorPadrao": 120.0, "custoPadrao": 18.0, "categoria": "Estética", "descricao": null},
  {"nome": "Criofrequência Facial", "duracaoPadrao": 30, "valorPadrao": 120.0, "custoPadrao": 18.0, "categoria": "Estética", "descricao": null},
  {"nome": "Drenagem linfática", "duracaoPadrao": 90, "valorPadrao": 125.0, "custoPadrao": 48.0, "categoria": "Estética", "descricao": null},
  {"nome": "Enzima Gordura localizada", "duracaoPadrao": 90, "valorPadrao": 150.0, "custoPadrao": 40.0, "categoria": "Estética", "descricao": null},
  {"nome": "Fios de PDO 10 fios", "duracaoPadrao": 90, "valorPadrao": 1200.0, "custoPadrao": 177.45, "categoria": "Estética", "descricao": null},
  {"nome": "Glúteo Max", "duracaoPadrao": 120, "valorPadrao": 1200.0, "custoPadrao": 330.0, "categoria": "Estética", "descricao": "pacote de 3 sessoes"},
  {"nome": "Hidragloss", "duracaoPadrao": 90, "valorPadrao": 120.0, "custoPadrao": 20.0, "categoria": "Estética", "descricao": null},
  {"nome": "Hidralips/gloss", "duracaoPadrao": 80, "valorPadrao": 150.0, "custoPadrao": 100.56, "categoria": "Estética", "descricao": null},
  {"nome": "Hidratação facial com máscara", "duracaoPadrao": 120, "valorPadrao": 250.0, "custoPadrao": 95.95, "categoria": "Estética", "descricao": null},
  {"nome": "Hidrolipo", "duracaoPadrao": 120, "valorPadrao": 120.0, "custoPadrao": 68.0, "categoria": "Estética", "descricao": null},
  {"nome": "Intradermoterapia para acne ativa", "duracaoPadrao": 85, "valorPadrao": 150.0, "custoPadrao": 86.0, "categoria": "Injetáveis", "descricao": null},
  {"nome": "Intradermoterapia capilar", "duracaoPadrao": 90, "valorPadrao": 190.0, "custoPadrao": 40.0, "categoria": "Injetáveis", "descricao": null},
  {"nome": "Intradermoterapia papada", "duracaoPadrao": 50, "valorPadrao": 150.0, "custoPadrao": 40.0, "categoria": "Injetáveis", "descricao": null},
  {"nome": "lash lifting", "duracaoPadrao": 90, "valorPadrao": 99.0, "custoPadrao": 45.0, "categoria": "Cílios e sobrancelhas", "descricao": null},
  {"nome": "Limpeza de pele luxo", "duracaoPadrao": 90, "valorPadrao": 148.0, "custoPadrao": 20.0, "categoria": "Estética", "descricao": null},
  {"nome": "Lipo de papada - enzimática", "duracaoPadrao": 30, "valorPadrao": 230.0, "custoPadrao": 40.0, "categoria": "Injetáveis", "descricao": null},
  {"nome": "Microagulhamento Corporal", "duracaoPadrao": 120, "valorPadrao": 280.0, "custoPadrao": 61.0, "categoria": "Estética", "descricao": null},
  {"nome": "Microagulhamento facial", "duracaoPadrao": 110, "valorPadrao": 320.0, "custoPadrao": 99.37, "categoria": "Estética", "descricao": null},
  {"nome": "Microlabial", "duracaoPadrao": 170, "valorPadrao": 350.0, "custoPadrao": 166.0, "categoria": "Microlabial", "descricao": null},
  {"nome": "Peeling de ácido salicílico Facial", "duracaoPadrao": 90, "valorPadrao": 180.0, "custoPadrao": 18.0, "categoria": "Facial", "descricao": null},
  {"nome": "Peeling hidratante pirúvico", "duracaoPadrao": 60, "valorPadrao": 100.0, "custoPadrao": 54.0, "categoria": "Estética", "descricao": null},
  {"nome": "Peeling Retinóico combo", "duracaoPadrao": 90, "valorPadrao": 700.0, "custoPadrao": 354.0, "categoria": "Estética", "descricao": null},
  {"nome": "Peeling tioglicólico", "duracaoPadrao": 50, "valorPadrao": 120.0, "custoPadrao": 18.0, "categoria": "Facial", "descricao": null},
  {"nome": "Preenchimento labial Rennova", "duracaoPadrao": 90, "valorPadrao": 800.0, "custoPadrao": 480.0, "categoria": "Estética", "descricao": null},
  {"nome": "Preenchimento Mento/Mand/zigomat Rennova", "duracaoPadrao": 90, "valorPadrao": 800.0, "custoPadrao": 390.0, "categoria": "Estética", "descricao": null},
  {"nome": "Preenchimento olheira Renova", "duracaoPadrao": 90, "valorPadrao": 600.0, "custoPadrao": 234.0, "categoria": "Estética", "descricao": null},
  {"nome": "Protocolo clareamento Dermo", "duracaoPadrao": 120, "valorPadrao": 148.0, "custoPadrao": 80.0, "categoria": "Estética", "descricao": null},
  {"nome": "Radiofrequência", "duracaoPadrao": 15, "valorPadrao": 100.0, "custoPadrao": 18.0, "categoria": "Estética", "descricao": null},
  {"nome": "Radiofrequência + corrente russa", "duracaoPadrao": 90, "valorPadrao": 700.0, "custoPadrao": 40.0, "categoria": "Estética", "descricao": null},
  {"nome": "Rejuvenescimento Facial - Exossomos", "duracaoPadrao": 110, "valorPadrao": 150.0, "custoPadrao": 60.0, "categoria": "Estética", "descricao": null},
  {"nome": "Secativo injetável", "duracaoPadrao": 30, "valorPadrao": 150.0, "custoPadrao": 90.0, "categoria": "Estética", "descricao": null},
  {"nome": "Sessão de hialuronidase", "duracaoPadrao": 120, "valorPadrao": 250.0, "custoPadrao": 80.0, "categoria": "Injetáveis", "descricao": null},
  {"nome": "Skinbooster", "duracaoPadrao": 110, "valorPadrao": 400.0, "custoPadrao": 182.0, "categoria": "Estética", "descricao": null},
] as const;
