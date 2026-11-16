#!/usr/bin/env node
/*
 * FINALIZAR ATENDIMENTO: NAO PERDER FOTOS - Studio Realcar
 *
 * Se houver fotos escolhidas e ainda nao salvas, o "Revisar" nao deixa
 * seguir: aparece o aviso ao lado do botao, a parte das fotos abre e a tela
 * rola ate o botao "Salvar N fotos". Enquanto envia, pede para aguardar.
 * Fechar a tela com fotos sem salvar pede confirmacao. O titulo "Fotos da
 * cliente" mostra "N sem salvar".
 *
 * Nao muda o banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node finalizar-sem-perder-fotos.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/clientes/components/ClienteFotoUploadForm.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"type Props = {\n  clienteId: number;\n  driveConfigurado: boolean;\n};","depois":"type Props = {\n  clienteId: number;\n  driveConfigurado: boolean;\n  // Avisa quem usa este formulario quantas fotos estao escolhidas e ainda\n  // nao salvas (a finalizacao do atendimento usa para nao deixar perder).\n  onPendentesChange?: (estado: { pendentes: number; enviando: boolean }) => void;\n};"},{"nome":"ajuste 2","antes":"export function ClienteFotoUploadForm({ clienteId, driveConfigurado }: Props) {","depois":"export function ClienteFotoUploadForm({ clienteId, driveConfigurado, onPendentesChange }: Props) {"},{"nome":"ajuste 3","antes":"  const busy = status !== \"idle\";\n","depois":"  const busy = status !== \"idle\";\n\n  useEffect(() => {\n    onPendentesChange?.({ pendentes: selectedPhotos.length, enviando: busy });\n  }, [selectedPhotos.length, busy, onPendentesChange]);\n\n  useEffect(() => {\n    return () => onPendentesChange?.({ pendentes: 0, enviando: false });\n  }, [onPendentesChange]);\n"}]},{"arquivo":"app/(app)/agenda/components/FinalizarAtendimentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const [confirmando, setConfirmando] = useState(false);","depois":"  const [confirmando, setConfirmando] = useState(false);\n  // Fotos escolhidas e ainda nao salvas: nao deixa finalizar (ao revisar,\n  // a parte das fotos sai da tela e elas seriam perdidas).\n  const [fotosPendentes, setFotosPendentes] = useState({ pendentes: 0, enviando: false });\n  const fotosRef = useRef<HTMLDetailsElement>(null);"},{"nome":"ajuste 2","antes":"  function limparEFechar() {\n    setConfirmando(false);","depois":"  function limparEFechar() {\n    if (\n      !finalizado &&\n      fotosPendentes.pendentes > 0 &&\n      !window.confirm(\n        `${fotosPendentes.pendentes === 1 ? \"1 foto ainda não foi salva e será perdida\" : `${fotosPendentes.pendentes} fotos ainda não foram salvas e serão perdidas`}. Fechar mesmo assim?`,\n      )\n    ) {\n      return;\n    }\n    setConfirmando(false);"},{"nome":"ajuste 3","antes":"  function validarAntesDeConfirmar() {\n    setError(null);\n","depois":"  function validarAntesDeConfirmar() {\n    setError(null);\n\n    if (fotosPendentes.enviando || fotosPendentes.pendentes > 0) {\n      const n = fotosPendentes.pendentes;\n      setError(\n        fotosPendentes.enviando\n          ? \"Aguarde terminar de enviar as fotos antes de finalizar.\"\n          : `${n === 1 ? \"1 foto ainda não foi salva\" : `${n} fotos ainda não foram salvas`}. Toque em \"${n === 1 ? \"Salvar foto clínica\" : `Salvar ${n} fotos`}\" antes de finalizar, ou remova as fotos que não quer guardar.`,\n      );\n      if (fotosRef.current) {\n        fotosRef.current.open = true;\n        fotosRef.current.scrollIntoView({ behavior: \"smooth\", block: \"start\" });\n      }\n      return;\n    }\n"},{"nome":"ajuste 4","antes":"                  <details className=\"border-b border-slate-100 px-4 pb-4\">\n                    <summary className=\"flex cursor-pointer items-center gap-2 py-3 text-xs font-bold text-slate-900\">\n                      <Camera size={16} className=\"text-violet-600\" />\n                      Fotos da cliente, opcional agora\n                    </summary>\n\n                    <div className=\"pt-1\">\n                      <ClienteFotoUploadForm\n                        clienteId={currentAppointment.clienteId}\n                        driveConfigurado={driveConfigurado ?? false}\n                      />","depois":"                  <details ref={fotosRef} className=\"scroll-mt-3 border-b border-slate-100 px-4 pb-4\">\n                    <summary className=\"flex cursor-pointer items-center gap-2 py-3 text-xs font-bold text-slate-900\">\n                      <Camera size={16} className=\"text-violet-600\" />\n                      Fotos da cliente, opcional agora\n                      {fotosPendentes.pendentes > 0 ? (\n                        <span className=\"rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800\">\n                          {fotosPendentes.pendentes} sem salvar\n                        </span>\n                      ) : null}\n                    </summary>\n\n                    <div className=\"pt-1\">\n                      <ClienteFotoUploadForm\n                        clienteId={currentAppointment.clienteId}\n                        driveConfigurado={driveConfigurado ?? false}\n                        onPendentesChange={setFotosPendentes}\n                      />"},{"nome":"ajuste 5","antes":"            <footer className=\"shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4\">\n              <div className=\"grid grid-cols-2 gap-2\">\n                <button type=\"button\" onClick={limparEFechar} className=\"h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50\">Cancelar</button>\n                <button type=\"button\" onClick={validarAntesDeConfirmar}","depois":"            <footer className=\"shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4\">\n              {error ? (\n                // Aviso tambem perto do botao: quem esta no fim da tela via\n                // so que \"nao acontecia nada\".\n                <p role=\"alert\" className=\"mb-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold leading-4 text-rose-700\">\n                  <AlertCircle size={14} className=\"mt-0.5 shrink-0\" />\n                  <span>{error}</span>\n                </p>\n              ) : fotosPendentes.pendentes > 0 ? (\n                <p className=\"mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-4 text-amber-800\">\n                  {fotosPendentes.pendentes === 1 ? \"1 foto ainda não foi salva.\" : `${fotosPendentes.pendentes} fotos ainda não foram salvas.`} Salve antes de finalizar.\n                </p>\n              ) : null}\n              <div className=\"grid grid-cols-2 gap-2\">\n                <button type=\"button\" onClick={limparEFechar} className=\"h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50\">Cancelar</button>\n                <button type=\"button\" onClick={validarAntesDeConfirmar}"}]}]};
const raiz = process.cwd();
const aGravar = [];
let erros = 0;
let avisos = 0;

for (const [relativo, conteudo] of Object.entries(DATA.novosArquivos)) {
  const caminho = path.join(raiz, ...relativo.split("/"));
  const existente = fs.existsSync(caminho) ? fs.readFileSync(caminho, "utf8").replace(/\r\n/g, "\n") : null;
  if (existente === conteudo) {
    console.log("[pulou] " + relativo + " - ja existe igual");
  } else {
    aGravar.push({ caminho, conteudo, pasta: true });
    console.log((existente === null ? "[ok] criar " : "[ok] atualizar ") + relativo);
  }
}

for (const arq of DATA.arquivos) {
  const caminho = path.join(raiz, ...arq.arquivo.split("/"));
  if (!fs.existsSync(caminho)) {
    if (arq.obrigatorio) { console.log("[erro] arquivo nao encontrado: " + arq.arquivo + ". Rode na pasta do projeto."); erros++; }
    else { console.log("[aviso] arquivo nao encontrado, mantido: " + arq.arquivo); avisos++; }
    continue;
  }
  const bruto = fs.readFileSync(caminho, "utf8");
  const crlf = bruto.includes("\r\n");
  let texto = bruto.replace(/\r\n/g, "\n");
  let mudou = false;

  for (const p of arq.patches) {
    const ocorrencias = texto.split(p.antes).length - 1;
    if (p.modo === "remover") {
      // trecho a ser tirado: se ainda existe, tira; se nao existe, ja foi feito
      if (ocorrencias === 1) {
        texto = texto.replace(p.antes, () => p.depois);
        mudou = true;
        console.log("[ok] " + p.nome + " (" + arq.arquivo + ")");
      } else if (ocorrencias === 0) {
        console.log("[pulou] " + p.nome + " (" + arq.arquivo + ") - ja feito ou trecho diferente");
      } else {
        console.log("[aviso] " + p.nome + " (" + arq.arquivo + ") - aparece mais de uma vez, mantido");
        avisos++;
      }
      continue;
    }
    if (texto.includes(p.depois)) {
      console.log("[pulou] " + p.nome + " (" + arq.arquivo + ") - ja aplicado");
    } else if (ocorrencias === 1) {
      texto = texto.replace(p.antes, () => p.depois);
      mudou = true;
      console.log("[ok] " + p.nome + " (" + arq.arquivo + ")");
    } else {
      console.log("[erro] " + p.nome + " (" + arq.arquivo + ") - trecho nao encontrado");
      erros++;
    }
  }
  if (mudou) aGravar.push({ caminho, conteudo: crlf ? texto.replace(/\n/g, "\r\n") : texto });
}

if (erros > 0) {
  console.log("\nNada foi gravado: " + erros + " problema(s). Me mande esta tela.");
  process.exit(1);
}
for (const g of aGravar) {
  if (g.pasta) fs.mkdirSync(path.dirname(g.caminho), { recursive: true });
  fs.writeFileSync(g.caminho, g.conteudo, "utf8");
}
if (avisos > 0) console.log("\n" + avisos + " aviso(s): trechos opcionais que ficaram como estavam (nada quebra).");
console.log("\nConcluido.");
