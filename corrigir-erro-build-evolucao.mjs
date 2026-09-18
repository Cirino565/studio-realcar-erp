/**
 * CORRECAO URGENTE - erro de build apos "adiantar evolucao" (erro meu)
 *
 * O QUE ACONTECEU
 *
 * A correcao anterior tornou o campo "pendenteDesde" opcional num tipo
 * compartilhado (necessario para o novo botao de adiantar evolucao, que
 * nao tem essa data). Só que outros dois arquivos - o card de evolucoes
 * pendentes do Dashboard e a tela "Evolucoes pendentes" do menu -
 * dependem do mesmo tipo e esperavam esse campo sempre preenchido. Isso
 * quebrou o "npm run build".
 *
 * A CORRECAO
 *
 * Esses dois arquivos agora lidam corretamente com o campo podendo nao
 * vir preenchido (o que nunca acontece de verdade nesses dois casos
 * especificos, mas o TypeScript nao tinha como saber disso).
 *
 * Nenhum comportamento visual muda - os dois continuam mostrando "ha X
 * dias" normalmente.
 *
 * Como usar: coloque este arquivo na RAIZ do projeto e rode
 *     node corrigir-erro-build-evolucao.mjs
 *
 * E seguro rodar duas vezes.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { Buffer } from "node:buffer";

console.log("\nCorrecao urgente - erro de build\n");

if (!existsSync("package.json")) {
  console.error("ERRO: rode este script na pasta raiz do projeto (a mesma do package.json).\n");
  process.exit(1);
}

const arquivos = [
  {
    rotulo: "tela de evolucoes pendentes: corrige erro de build",
    caminho: "app/(app)/evolucoes-pendentes/components/EvolucoesPendentesPageClient.tsx",
    conteudo:
      "InVzZSBjbGllbnQiOwoKaW1wb3J0IHsgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tICJyZWFjdCI7CmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb2" +
      "0gIm5leHQvbmF2aWdhdGlvbiI7CmltcG9ydCB7IEFjdGl2aXR5LCBBbGVydFRyaWFuZ2xlLCBDaGVja0NpcmNsZTIsIFNlYXJjaCB9IGZyb20g" +
      "Imx1Y2lkZS1yZWFjdCI7CgppbXBvcnQgUmVnaXN0cmFyRXZvbHVjYW9QZW5kZW50ZU1vZGFsLCB7CiAgdHlwZSBFdm9sdWNhb1BlbmRlbnRlSX" +
      "RlbSwKfSBmcm9tICJAL2NvbXBvbmVudHMvYXRlbmRpbWVudG8vUmVnaXN0cmFyRXZvbHVjYW9QZW5kZW50ZU1vZGFsIjsKCnR5cGUgUHJvcHMg" +
      "PSB7CiAgaXRlbnNJbmljaWFpczogRXZvbHVjYW9QZW5kZW50ZUl0ZW1bXTsKfTsKCmZ1bmN0aW9uIG5vcm1hbGl6YXJCdXNjYSh2YWxvcjogc3" +
      "RyaW5nKSB7CiAgcmV0dXJuIHZhbG9yCiAgICAubm9ybWFsaXplKCJORkQiKQogICAgLnJlcGxhY2UoL1tcdTAzMDAtXHUwMzZmXS9nLCAiIikK" +
      "ICAgIC50cmltKCkKICAgIC50b0xvd2VyQ2FzZSgpOwp9CgpmdW5jdGlvbiB0ZW1wb1BlbmRlbnRlKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZW" +
      "QpIHsKICBpZiAoIXZhbHVlKSByZXR1cm4gImjDoSBwb3VjbyB0ZW1wbyI7CgogIGNvbnN0IGRpZmYgPSBNYXRoLm1heCgwLCBEYXRlLm5vdygp" +
      "IC0gbmV3IERhdGUodmFsdWUpLmdldFRpbWUoKSk7CiAgY29uc3QgaG9yYXMgPSBNYXRoLmZsb29yKGRpZmYgLyAoNjAgKiA2MCAqIDEwMDApKT" +
      "sKICBpZiAoaG9yYXMgPCAxKSByZXR1cm4gImjDoSBtZW5vcyBkZSAxIGhvcmEiOwogIGlmIChob3JhcyA8IDI0KSByZXR1cm4gYGjDoSAke2hv" +
      "cmFzfSBob3JhJHtob3JhcyA9PT0gMSA/ICIiIDogInMifWA7CiAgY29uc3QgZGlhcyA9IE1hdGguZmxvb3IoaG9yYXMgLyAyNCk7CiAgaWYgKG" +
      "RpYXMgPCAzMCkgcmV0dXJuIGBow6EgJHtkaWFzfSBkaWEke2RpYXMgPT09IDEgPyAiIiA6ICJzIn1gOwogIGNvbnN0IG1lc2VzID0gTWF0aC5m" +
      "bG9vcihkaWFzIC8gMzApOwogIHJldHVybiBgaMOhICR7bWVzZXN9ICR7bWVzZXMgPT09IDEgPyAibcOqcyIgOiAibWVzZXMifWA7Cn0KCmZ1bm" +
      "N0aW9uIGZvcm1hdGFyRGF0YUF0ZW5kaW1lbnRvKHZhbHVlOiBzdHJpbmcpIHsKICByZXR1cm4gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQoInB0" +
      "LUJSIiwgewogICAgZGF5OiAiMi1kaWdpdCIsCiAgICBtb250aDogIjItZGlnaXQiLAogICAgeWVhcjogIm51bWVyaWMiLAogIH0pLmZvcm1hdC" +
      "huZXcgRGF0ZSh2YWx1ZSkpOwp9CgovLyBEZXBvaXMgZGUgMyBkaWFzIHNlbSByZWdpc3RyYXIsIG8gYXRyYXNvIHZpcmEgZGVzdGFxdWUgbWFp" +
      "cyBmb3J0ZSAtCi8vIGFqdWRhIGEgYmF0ZXIgbyBvbGhvIGUgc2FiZXIgbyBxdWUgasOhIHBhc3NvdSBkbyByYXpvw6F2ZWwuCi8vCi8vICJwZW" +
      "5kZW50ZURlc2RlIiDDqSBvcGNpb25hbCBubyB0aXBvIGNvbXBhcnRpbGhhZG8gKG8gbW9kYWwgdGFtYsOpbSBzZXJ2ZQovLyBwYXJhIGFkaWFu" +
      "dGFyIGV2b2x1w6fDo28sIGNhc28gc2VtIGVzc2EgZGF0YSkgLSBtYXMgbmVzdGEgdGVsYSBzw7MgYXBhcmVjZW0KLy8gcGVuZMOqbmNpYXMgZG" +
      "UgdmVyZGFkZSwgcXVlIHNlbXByZSB0w6ptIGVzc2EgZGF0YSBwcmVlbmNoaWRhLiBPIGA/PyAiImAKLy8gYWJhaXhvIMOpIHPDsyBwYXJhIG8g" +
      "VHlwZVNjcmlwdCBhY2VpdGFyLCBzZW0gbXVkYXIgbyBjb21wb3J0YW1lbnRvIHJlYWwuCmZ1bmN0aW9uIGVzdGFBdHJhc2FkYShwZW5kZW50ZU" +
      "Rlc2RlOiBzdHJpbmcgfCB1bmRlZmluZWQpIHsKICBpZiAoIXBlbmRlbnRlRGVzZGUpIHJldHVybiBmYWxzZTsKCiAgY29uc3QgZGlhcyA9IChE" +
      "YXRlLm5vdygpIC0gbmV3IERhdGUocGVuZGVudGVEZXNkZSkuZ2V0VGltZSgpKSAvICgyNCAqIDYwICogNjAgKiAxMDAwKTsKICByZXR1cm4gZG" +
      "lhcyA+PSAzOwp9CgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBFdm9sdWNvZXNQZW5kZW50ZXNQYWdlQ2xpZW50KHsgaXRlbnNJbmljaWFpcyB9" +
      "OiBQcm9wcykgewogIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpOwogIGNvbnN0IFtyZXNvbHZpZG9zLCBzZXRSZXNvbHZpZG9zXSA9IHVzZV" +
      "N0YXRlPG51bWJlcltdPihbXSk7CiAgY29uc3QgW3NlbGVjaW9uYWRvSWQsIHNldFNlbGVjaW9uYWRvSWRdID0gdXNlU3RhdGU8bnVtYmVyIHwg" +
      "bnVsbD4obnVsbCk7CiAgY29uc3QgW2J1c2NhLCBzZXRCdXNjYV0gPSB1c2VTdGF0ZSgiIik7CgogIGNvbnN0IHBlbmRlbnRlcyA9IHVzZU1lbW" +
      "8oCiAgICAoKSA9PiBpdGVuc0luaWNpYWlzLmZpbHRlcigoaXRlbSkgPT4gIXJlc29sdmlkb3MuaW5jbHVkZXMoaXRlbS5pZCkpLAogICAgW2l0" +
      "ZW5zSW5pY2lhaXMsIHJlc29sdmlkb3NdLAogICk7CgogIGNvbnN0IHBlbmRlbnRlc0ZpbHRyYWRvcyA9IHVzZU1lbW8oKCkgPT4gewogICAgY2" +
      "9uc3QgdGVybW8gPSBub3JtYWxpemFyQnVzY2EoYnVzY2EpOwogICAgaWYgKCF0ZXJtbykgcmV0dXJuIHBlbmRlbnRlczsKCiAgICByZXR1cm4g" +
      "cGVuZGVudGVzLmZpbHRlcigKICAgICAgKGl0ZW0pID0+CiAgICAgICAgbm9ybWFsaXphckJ1c2NhKGl0ZW0uY2xpZW50ZSkuaW5jbHVkZXModG" +
      "VybW8pIHx8CiAgICAgICAgbm9ybWFsaXphckJ1c2NhKGl0ZW0ucHJvY2VkaW1lbnRvKS5pbmNsdWRlcyh0ZXJtbykgfHwKICAgICAgICBub3Jt" +
      "YWxpemFyQnVzY2EoaXRlbS5wcm9maXNzaW9uYWwgfHwgIiIpLmluY2x1ZGVzKHRlcm1vKSwKICAgICk7CiAgfSwgW3BlbmRlbnRlcywgYnVzY2" +
      "FdKTsKCiAgY29uc3Qgc2VsZWNpb25hZG8gPQogICAgcGVuZGVudGVzRmlsdHJhZG9zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlbGVj" +
      "aW9uYWRvSWQpIHx8IG51bGw7CgogIGZ1bmN0aW9uIGNvbmNsdWlyKGlkOiBudW1iZXIpIHsKICAgIHNldFJlc29sdmlkb3MoKGF0dWFpcykgPT" +
      "4gWy4uLmF0dWFpcywgaWRdKTsKICAgIHNldFNlbGVjaW9uYWRvSWQobnVsbCk7CiAgICAvLyBBdHVhbGl6YSBvcyBuw7ptZXJvcyBkbyBjYXJk" +
      "IG5vIERhc2hib2FyZCB0YW1iw6ltLCBzZW0gcHJlY2lzYXIKICAgIC8vIHRyb2NhciBkZSB0ZWxhLgogICAgcm91dGVyLnJlZnJlc2goKTsKIC" +
      "B9CgogIGNvbnN0IHRvdGFsQXRyYXNhZGFzID0gcGVuZGVudGVzLmZpbHRlcigoaXRlbSkgPT4KICAgIGVzdGFBdHJhc2FkYShpdGVtLnBlbmRl" +
      "bnRlRGVzZGUpLAogICkubGVuZ3RoOwoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9ImFwcC1tb2JpbGUtc2FmZSBzcGFjZS15LTQgcG" +
      "ItNiBzbTpzcGFjZS15LTYgc206cGItMCI+CiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT0icmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuIHJvdW5k" +
      "ZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXdoaXRlIHAtNCBzaGFkb3ctc20gZGFyazpib3JkZXItd2hpdGUvMTAgZGFyazpiZy" +
      "13aGl0ZS9bMC4wNl0gc206cm91bmRlZC0zeGwgc206cC03Ij4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0icG9pbnRlci1ldmVudHMtbm9uZSBh" +
      "YnNvbHV0ZSBpbnNldC0wIGJnLVtyYWRpYWwtZ3JhZGllbnQoY2lyY2xlX2F0X3RvcF9yaWdodCxyZ2JhKDIxNywxMTksNiwwLjEyKSx0cmFuc3" +
      "BhcmVudF8zNiUpXSIgLz4KCiAgICAgICAgPGRpdiBjbGFzc05hbWU9InJlbGF0aXZlIGZsZXggZmxleC13cmFwIGl0ZW1zLXN0YXJ0IGp1c3Rp" +
      "ZnktYmV0d2VlbiBnYXAtMyI+CiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibWluLXctMCI+CiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPS" +
      "JpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItYW1iZXItMjAwIGJnLWFtYmVyLTUwIHB4" +
      "LTMgcHktMS41IHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWFtYmVyLTcwMCBkYXJrOmJvcmRlci1hbWJlci00MDAvMjAgZGFyazpiZy1hbW" +
      "Jlci01MDAvMTUgZGFyazp0ZXh0LWFtYmVyLTIwMCI+CiAgICAgICAgICAgICAgPEFjdGl2aXR5IHNpemU9ezE0fSAvPgogICAgICAgICAgICAg" +
      "IFJlZ2lzdHJvIGNsw61uaWNvCiAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT0ibXQtMyB0ZXh0LXhsIGZvbn" +
      "QtYm9sZCB0cmFja2luZy10aWdodCB0ZXh0LXNsYXRlLTkwMCBkYXJrOnRleHQtd2hpdGUgc206dGV4dC0zeGwiPgogICAgICAgICAgICAgIEV2" +
      "b2x1w6fDtWVzIHBlbmRlbnRlcwogICAgICAgICAgICA8L2gxPgoKICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJtdC0yIG1heC13LTJ4bCB0ZX" +
      "h0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTYwMCBkYXJrOnRleHQtc2xhdGUtNDAwIj4KICAgICAgICAgICAgICBUb2RvcyBvcyBhdGVuZGlt" +
      "ZW50b3MgZmluYWxpemFkb3MgcXVlIGFpbmRhIGVzcGVyYW0gbyByZWdpc3RybwogICAgICAgICAgICAgIGNsw61uaWNvLCBkbyBtYWlzIGFudG" +
      "lnbyBwYXJhIG8gbWFpcyByZWNlbnRlLiBOYWRhIHNhaSBkZXNzYQogICAgICAgICAgICAgIGxpc3RhIGF0w6kgdm9jw6ogcmVnaXN0cmFyIGEg" +
      "ZXZvbHXDp8Ojby4KICAgICAgICAgICAgPC9wPgogICAgICAgICAgPC9kaXY+CgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXggZ2FwLT" +
      "IiPgogICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0icm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctd2hpdGUgcHgtNCBw" +
      "eS0yLjUgdGV4dC1jZW50ZXIgc2hhZG93LXNtIGRhcms6Ym9yZGVyLXdoaXRlLzEwIGRhcms6Ymctd2hpdGUvWzAuMDZdIj4KICAgICAgICAgIC" +
      "AgICA8cCBjbGFzc05hbWU9InRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTkwMCBkYXJrOnRleHQtd2hpdGUiPgogICAgICAgICAgICAg" +
      "ICAge3BlbmRlbnRlcy5sZW5ndGh9CiAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTFweF0gZm" +
      "9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTUwMCBkYXJrOnRleHQtc2xhdGUtNDAwIj4KICAgICAgICAgICAgICAgIG5vIHRvdGFsCiAgICAgICAg" +
      "ICAgICAgPC9wPgogICAgICAgICAgICA8L2Rpdj4KCiAgICAgICAgICAgIHt0b3RhbEF0cmFzYWRhcyA+IDAgPyAoCiAgICAgICAgICAgICAgPG" +
      "RpdiBjbGFzc05hbWU9InJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItcm9zZS0yMDAgYmctcm9zZS01MCBweC00IHB5LTIuNSB0ZXh0LWNlbnRl" +
      "ciBkYXJrOmJvcmRlci1yb3NlLTQwMC8yMCBkYXJrOmJnLXJvc2UtNTAwLzEwIj4KICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC" +
      "0yeGwgZm9udC1ib2xkIHRleHQtcm9zZS03MDAgZGFyazp0ZXh0LXJvc2UtMzAwIj4KICAgICAgICAgICAgICAgICAge3RvdGFsQXRyYXNhZGFz" +
      "fQogICAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHRleH" +
      "Qtcm9zZS02MDAgZGFyazp0ZXh0LXJvc2UtMzAwIj4KICAgICAgICAgICAgICAgICAgaMOhIDMrIGRpYXMKICAgICAgICAgICAgICAgIDwvcD4K" +
      "ICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgKSA6IG51bGx9CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L2Rpdj4KICAgICAgPC" +
      "9zZWN0aW9uPgoKICAgICAgPGxhYmVsIGNsYXNzTmFtZT0icmVsYXRpdmUgYmxvY2sgbWluLXctMCI+CiAgICAgICAgPHNwYW4gY2xhc3NOYW1l" +
      "PSJzci1vbmx5Ij5CdXNjYXIgcG9yIGNsaWVudGUsIHByb2NlZGltZW50byBvdSBwcm9maXNzaW9uYWw8L3NwYW4+CgogICAgICAgIDxTZWFyY2" +
      "gKICAgICAgICAgIHNpemU9ezE4fQogICAgICAgICAgY2xhc3NOYW1lPSJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGxlZnQtNCB0b3At" +
      "MS8yIC10cmFuc2xhdGUteS0xLzIgdGV4dC1zbGF0ZS00MDAiCiAgICAgICAgLz4KCiAgICAgICAgPGlucHV0CiAgICAgICAgICB2YWx1ZT17Yn" +
      "VzY2F9CiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRCdXNjYShldmVudC50YXJnZXQudmFsdWUpfQogICAgICAgICAgcGxhY2Vo" +
      "b2xkZXI9IkJ1c2NhciBwb3IgY2xpZW50ZSwgcHJvY2VkaW1lbnRvIG91IHByb2Zpc3Npb25hbCIKICAgICAgICAgIGNsYXNzTmFtZT0icHJlbW" +
      "l1bS1pbnB1dCB3LWZ1bGwgcGwtMTEiCiAgICAgICAgLz4KICAgICAgPC9sYWJlbD4KCiAgICAgIHtwZW5kZW50ZXNGaWx0cmFkb3MubGVuZ3Ro" +
      "ID09PSAwID8gKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLWRhc2hlZCBib3JkZXItZW1lcmFsZC" +
      "0yMDAgYmctZW1lcmFsZC01MC83MCBwLTggdGV4dC1jZW50ZXIgZGFyazpib3JkZXItZW1lcmFsZC00MDAvMjAgZGFyazpiZy1lbWVyYWxkLTUw" +
      "MC8xMCI+CiAgICAgICAgICA8Q2hlY2tDaXJjbGUyIGNsYXNzTmFtZT0ibXgtYXV0byBzaXplLTcgdGV4dC1lbWVyYWxkLTYwMCBkYXJrOnRleH" +
      "QtZW1lcmFsZC0zMDAiIC8+CiAgICAgICAgICA8cCBjbGFzc05hbWU9Im10LTMgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtZW1lcmFsZC05" +
      "MDAgZGFyazp0ZXh0LWVtZXJhbGQtMjAwIj4KICAgICAgICAgICAge2J1c2NhCiAgICAgICAgICAgICAgPyAiTmVuaHVtIHJlc3VsdGFkbyBwYX" +
      "JhIGVzc2EgYnVzY2EuIgogICAgICAgICAgICAgIDogIk5lbmh1bWEgZXZvbHXDp8OjbyBwZW5kZW50ZS4ifQogICAgICAgICAgPC9wPgogICAg" +
      "ICAgICAgPHAgY2xhc3NOYW1lPSJtdC0xIHRleHQteHMgdGV4dC1lbWVyYWxkLTcwMCBkYXJrOnRleHQtZW1lcmFsZC0zMDAiPgogICAgICAgIC" +
      "AgICB7YnVzY2EKICAgICAgICAgICAgICA/ICJUZW50ZSBidXNjYXIgcG9yIG91dHJvIG5vbWUgb3UgcHJvY2VkaW1lbnRvLiIKICAgICAgICAg" +
      "ICAgICA6ICJUb2RvcyBvcyBhdGVuZGltZW50b3MgZmluYWxpemFkb3MgZXN0w6NvIGNvbSBvcyByZWdpc3Ryb3MgY2zDrW5pY29zIGVtIGRpYS" +
      "4ifQogICAgICAgICAgPC9wPgogICAgICAgIDwvZGl2PgogICAgICApIDogKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJzcGFjZS15LTIuNSI+" +
      "CiAgICAgICAgICB7cGVuZGVudGVzRmlsdHJhZG9zLm1hcCgoaXRlbSkgPT4gewogICAgICAgICAgICBjb25zdCBhdHJhc2FkYSA9IGVzdGFBdH" +
      "Jhc2FkYShpdGVtLnBlbmRlbnRlRGVzZGUpOwoKICAgICAgICAgICAgcmV0dXJuICgKICAgICAgICAgICAgICA8ZGl2CiAgICAgICAgICAgICAg" +
      "ICBrZXk9e2l0ZW0uaWR9CiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2Byb3VuZGVkLTJ4bCBib3JkZXIgYmctd2hpdGUgcC00IHNoYWRvdy" +
      "1zbSBkYXJrOmJnLXdoaXRlL1swLjA0XSAkewogICAgICAgICAgICAgICAgICBhdHJhc2FkYQogICAgICAgICAgICAgICAgICAgID8gImJvcmRl" +
      "ci1yb3NlLTIwMCBkYXJrOmJvcmRlci1yb3NlLTQwMC8yNSIKICAgICAgICAgICAgICAgICAgICA6ICJib3JkZXItYW1iZXItMjAwIGRhcms6Ym" +
      "9yZGVyLWFtYmVyLTQwMC8yMCIKICAgICAgICAgICAgICAgIH1gfQogICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NO" +
      "YW1lPSJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyI+CiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJtaW" +
      "4tdy0wIj4KICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRydW5jYXRlIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS05MDAgZGFy" +
      "azp0ZXh0LXdoaXRlIj4KICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLmNsaWVudGV9CiAgICAgICAgICAgICAgICAgICAgPC9wPgogICAgIC" +
      "AgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0ibXQtMC41IHRydW5jYXRlIHRleHQtc20gdGV4dC1zbGF0ZS01MDAgZGFyazp0ZXh0LXNsYXRl" +
      "LTQwMCI+CiAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5wcm9jZWRpbWVudG99IMK3IHtmb3JtYXRhckRhdGFBdGVuZGltZW50byhpdGVtLm" +
      "RhdGEpfQogICAgICAgICAgICAgICAgICAgIDwvcD4KCiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9Im10LTIgZmxleCBmbGV4" +
      "LXdyYXAgZ2FwLTEuNSB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIj4KICAgICAgICAgICAgICAgICAgICAgIDxzcGFuCiAgICAgICAgICAgIC" +
      "AgICAgICAgICAgIGNsYXNzTmFtZT17YHJvdW5kZWQtbGcgcHgtMiBweS0xICR7CiAgICAgICAgICAgICAgICAgICAgICAgICAgYXRyYXNhZGEK" +
      "ICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gImJnLXJvc2UtNTAgdGV4dC1yb3NlLTcwMCBkYXJrOmJnLXJvc2UtNTAwLzE1IGRhcms6dG" +
      "V4dC1yb3NlLTMwMCIKICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogImJnLWFtYmVyLTUwIHRleHQtYW1iZXItNzAwIGRhcms6YmctYW1i" +
      "ZXItNTAwLzE1IGRhcms6dGV4dC1hbWJlci0zMDAiCiAgICAgICAgICAgICAgICAgICAgICAgIH1gfQogICAgICAgICAgICAgICAgICAgICAgPg" +
      "ogICAgICAgICAgICAgICAgICAgICAgICB7dGVtcG9QZW5kZW50ZShpdGVtLnBlbmRlbnRlRGVzZGUpfQogICAgICAgICAgICAgICAgICAgICAg" +
      "PC9zcGFuPgoKICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLnByb2Zpc3Npb25hbCA/ICgKICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW" +
      "4gY2xhc3NOYW1lPSJyb3VuZGVkLWxnIGJnLXNsYXRlLTEwMCBweC0yIHB5LTEgdGV4dC1zbGF0ZS02MDAgZGFyazpiZy13aGl0ZS9bMC4wNl0g" +
      "ZGFyazp0ZXh0LXNsYXRlLTMwMCI+CiAgICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW0ucHJvZmlzc2lvbmFsfQogICAgICAgICAgICAgIC" +
      "AgICAgICAgICA8L3NwYW4+CiAgICAgICAgICAgICAgICAgICAgICApIDogbnVsbH0KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAg" +
      "ICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICAgICAgICA8c3BhbgogICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGlubGluZS" +
      "1mbGV4IHNocmluay0wIGl0ZW1zLWNlbnRlciBnYXAtMSByb3VuZGVkLWZ1bGwgcHgtMi41IHB5LTEgdGV4dC1bMTBweF0gZm9udC1ib2xkIHVw" +
      "cGVyY2FzZSB0cmFja2luZy13aWRlICR7CiAgICAgICAgICAgICAgICAgICAgICBhdHJhc2FkYQogICAgICAgICAgICAgICAgICAgICAgICA/IC" +
      "JiZy1yb3NlLTUwIHRleHQtcm9zZS03MDAgZGFyazpiZy1yb3NlLTUwMC8xNSBkYXJrOnRleHQtcm9zZS0zMDAiCiAgICAgICAgICAgICAgICAg" +
      "ICAgICAgIDogImJnLWFtYmVyLTUwIHRleHQtYW1iZXItNzAwIGRhcms6YmctYW1iZXItNTAwLzE1IGRhcms6dGV4dC1hbWJlci0zMDAiCiAgIC" +
      "AgICAgICAgICAgICAgICAgfWB9CiAgICAgICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgICAgICA8QWxlcnRUcmlhbmdsZSBzaXplPXsx" +
      "Mn0gLz4gUGVuZGVudGUKICAgICAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICAgICAgPG" +
      "J1dHRvbgogICAgICAgICAgICAgICAgICB0eXBlPSJidXR0b24iCiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjaW9u" +
      "YWRvSWQoaXRlbS5pZCl9CiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0ibXQtMyBpbmxpbmUtZmxleCBtaW4taC0xMCB3LWZ1bGwgaXRlbX" +
      "MtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHJvdW5kZWQteGwgYmctYW1iZXItNjAwIHB4LTMgcHktMiB0ZXh0LXhzIGZvbnQtYm9sZCB0" +
      "ZXh0LXdoaXRlIHRyYW5zaXRpb24gaG92ZXI6YmctYW1iZXItNzAwIgogICAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgICA8QWN0aX" +
      "ZpdHkgY2xhc3NOYW1lPSJzaXplLTQiIC8+CiAgICAgICAgICAgICAgICAgIFJlZ2lzdHJhciBldm9sdcOnw6NvCiAgICAgICAgICAgICAgICA8" +
      "L2J1dHRvbj4KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgKTsKICAgICAgICAgIH0pfQogICAgICAgIDwvZGl2PgogICAgICApfQ" +
      "oKICAgICAgPFJlZ2lzdHJhckV2b2x1Y2FvUGVuZGVudGVNb2RhbAogICAgICAgIG9wZW49e0Jvb2xlYW4oc2VsZWNpb25hZG8pfQogICAgICAg" +
      "IGl0ZW09e3NlbGVjaW9uYWRvfQogICAgICAgIHRlbVByb3hpbWE9e3BlbmRlbnRlc0ZpbHRyYWRvcy5sZW5ndGggPiAxfQogICAgICAgIG9uQ2" +
      "xvc2U9eygpID0+IHNldFNlbGVjaW9uYWRvSWQobnVsbCl9CiAgICAgICAgb25TYXZlZD17Y29uY2x1aXJ9CiAgICAgIC8+CiAgICA8L2Rpdj4K" +
      "ICApOwp9Cg==",
  },
  {
    rotulo: "dashboard: corrige o mesmo erro no card de evolucoes pendentes",
    caminho: "components/dashboard/EvolucoesPendentesClient.tsx",
    conteudo:
      "InVzZSBjbGllbnQiOw0KDQppbXBvcnQgeyB1c2VNZW1vLCB1c2VTdGF0ZSB9IGZyb20gInJlYWN0IjsNCmltcG9ydCB7IEFjdGl2aXR5LCBBbG" +
      "VydFRyaWFuZ2xlLCBDaGVja0NpcmNsZTIgfSBmcm9tICJsdWNpZGUtcmVhY3QiOw0KDQppbXBvcnQgUmVnaXN0cmFyRXZvbHVjYW9QZW5kZW50" +
      "ZU1vZGFsLCB7DQogIHR5cGUgRXZvbHVjYW9QZW5kZW50ZUl0ZW0sDQp9IGZyb20gIkAvY29tcG9uZW50cy9hdGVuZGltZW50by9SZWdpc3RyYX" +
      "JFdm9sdWNhb1BlbmRlbnRlTW9kYWwiOw0KDQp0eXBlIFByb3BzID0gew0KICBpdGVuczogRXZvbHVjYW9QZW5kZW50ZUl0ZW1bXTsNCiAgcG9k" +
      "ZVJlZ2lzdHJhcjogYm9vbGVhbjsNCn07DQoNCmZ1bmN0aW9uIHRlbXBvUGVuZGVudGUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCkgew0KIC" +
      "BpZiAoIXZhbHVlKSByZXR1cm4gImjDoSBwb3VjbyB0ZW1wbyI7DQoNCiAgY29uc3QgZGlmZiA9IE1hdGgubWF4KDAsIERhdGUubm93KCkgLSBu" +
      "ZXcgRGF0ZSh2YWx1ZSkuZ2V0VGltZSgpKTsNCiAgY29uc3QgaG9yYXMgPSBNYXRoLmZsb29yKGRpZmYgLyAoNjAgKiA2MCAqIDEwMDApKTsNCi" +
      "AgaWYgKGhvcmFzIDwgMSkgcmV0dXJuICJow6EgbWVub3MgZGUgMSBob3JhIjsNCiAgaWYgKGhvcmFzIDwgMjQpIHJldHVybiBgaMOhICR7aG9y" +
      "YXN9IGhvcmEke2hvcmFzID09PSAxID8gIiIgOiAicyJ9YDsNCiAgY29uc3QgZGlhcyA9IE1hdGguZmxvb3IoaG9yYXMgLyAyNCk7DQogIHJldH" +
      "VybiBgaMOhICR7ZGlhc30gZGlhJHtkaWFzID09PSAxID8gIiIgOiAicyJ9YDsNCn0NCg0KZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRXZvbHVj" +
      "b2VzUGVuZGVudGVzQ2xpZW50KHsgaXRlbnMsIHBvZGVSZWdpc3RyYXIgfTogUHJvcHMpIHsNCiAgY29uc3QgW3Jlc29sdmlkb3MsIHNldFJlc2" +
      "9sdmlkb3NdID0gdXNlU3RhdGU8bnVtYmVyW10+KFtdKTsNCiAgY29uc3QgW3NlbGVjaW9uYWRvSWQsIHNldFNlbGVjaW9uYWRvSWRdID0gdXNl" +
      "U3RhdGU8bnVtYmVyIHwgbnVsbD4obnVsbCk7DQoNCiAgY29uc3QgcGVuZGVudGVzID0gdXNlTWVtbygNCiAgICAoKSA9PiBpdGVucy5maWx0ZX" +
      "IoKGl0ZW0pID0+ICFyZXNvbHZpZG9zLmluY2x1ZGVzKGl0ZW0uaWQpKSwNCiAgICBbaXRlbnMsIHJlc29sdmlkb3NdLA0KICApOw0KICBjb25z" +
      "dCBzZWxlY2lvbmFkbyA9IHBlbmRlbnRlcy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWxlY2lvbmFkb0lkKSB8fCBudWxsOw0KDQogIG" +
      "Z1bmN0aW9uIGNvbmNsdWlyKGlkOiBudW1iZXIpIHsNCiAgICBjb25zdCBpbmRpY2UgPSBwZW5kZW50ZXMuZmluZEluZGV4KChpdGVtKSA9PiBp" +
      "dGVtLmlkID09PSBpZCk7DQogICAgY29uc3QgcHJveGltbyA9IHBlbmRlbnRlc1tpbmRpY2UgKyAxXSB8fCBwZW5kZW50ZXNbMF07DQoNCiAgIC" +
      "BzZXRSZXNvbHZpZG9zKChhdHVhaXMpID0+IFsuLi5hdHVhaXMsIGlkXSk7DQoNCiAgICBpZiAocHJveGltbyAmJiBwcm94aW1vLmlkICE9PSBp" +
      "ZCkgew0KICAgICAgc2V0U2VsZWNpb25hZG9JZChwcm94aW1vLmlkKTsNCiAgICB9IGVsc2Ugew0KICAgICAgc2V0U2VsZWNpb25hZG9JZChudW" +
      "xsKTsNCiAgICB9DQogIH0NCg0KICBpZiAocGVuZGVudGVzLmxlbmd0aCA9PT0gMCkgew0KICAgIHJldHVybiAoDQogICAgICA8ZGl2IGNsYXNz" +
      "TmFtZT0icm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1kYXNoZWQgYm9yZGVyLWVtZXJhbGQtMjAwIGJnLWVtZXJhbGQtNTAvNzAgcC01IHRleH" +
      "QtY2VudGVyIj4NCiAgICAgICAgPENoZWNrQ2lyY2xlMiBjbGFzc05hbWU9Im14LWF1dG8gc2l6ZS02IHRleHQtZW1lcmFsZC02MDAiIC8+DQog" +
      "ICAgICAgIDxwIGNsYXNzTmFtZT0ibXQtMiB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1lbWVyYWxkLTkwMCI+DQogICAgICAgICAgTmVuaH" +
      "VtYSBldm9sdcOnw6NvIHBlbmRlbnRlLg0KICAgICAgICA8L3A+DQogICAgICAgIDxwIGNsYXNzTmFtZT0ibXQtMSB0ZXh0LXhzIHRleHQtZW1l" +
      "cmFsZC03MDAiPg0KICAgICAgICAgIE9zIGF0ZW5kaW1lbnRvcyBmaW5hbGl6YWRvcyBlc3TDo28gY29tIG9zIHJlZ2lzdHJvcyBjbMOtbmljb3" +
      "MgZW0gZGlhLg0KICAgICAgICA8L3A+DQogICAgICA8L2Rpdj4NCiAgICApOw0KICB9DQoNCiAgcmV0dXJuICgNCiAgICA8Pg0KICAgICAgPGRp" +
      "diBjbGFzc05hbWU9InNwYWNlLXktMi41Ij4NCiAgICAgICAge3BlbmRlbnRlcy5tYXAoKGl0ZW0pID0+ICgNCiAgICAgICAgICA8ZGl2IGtleT" +
      "17aXRlbS5pZH0gY2xhc3NOYW1lPSJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLWFtYmVyLTIwMCBiZy13aGl0ZSBwLTMgc2hhZG93LXNtIj4N" +
      "CiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyI+DQogICAgICAgICAgIC" +
      "AgIDxkaXYgY2xhc3NOYW1lPSJtaW4tdy0wIj4NCiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRydW5jYXRlIGZvbnQtc2VtaWJvbGQg" +
      "dGV4dC1zbGF0ZS05MDAiPntpdGVtLmNsaWVudGV9PC9wPg0KICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0ibXQtMC41IHRydW5jYXRlIH" +
      "RleHQtc20gdGV4dC1zbGF0ZS01MDAiPntpdGVtLnByb2NlZGltZW50b308L3A+DQogICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9Im10" +
      "LTIgZmxleCBmbGV4LXdyYXAgZ2FwLTEuNSB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIj4NCiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYX" +
      "NzTmFtZT0icm91bmRlZC1sZyBiZy1hbWJlci01MCBweC0yIHB5LTEgdGV4dC1hbWJlci03MDAiPg0KICAgICAgICAgICAgICAgICAgICB7dGVt" +
      "cG9QZW5kZW50ZShpdGVtLnBlbmRlbnRlRGVzZGUpfQ0KICAgICAgICAgICAgICAgICAgPC9zcGFuPg0KICAgICAgICAgICAgICAgICAge2l0ZW" +
      "0ucHJvZmlzc2lvbmFsID8gKA0KICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InJvdW5kZWQtbGcgYmctc2xhdGUtMTAwIHB4" +
      "LTIgcHktMSB0ZXh0LXNsYXRlLTYwMCI+DQogICAgICAgICAgICAgICAgICAgICAge2l0ZW0ucHJvZmlzc2lvbmFsfQ0KICAgICAgICAgICAgIC" +
      "AgICAgICA8L3NwYW4+DQogICAgICAgICAgICAgICAgICApIDogbnVsbH0NCiAgICAgICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgICAgICAg" +
      "PC9kaXY+DQoNCiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJpbmxpbmUtZmxleCBzaHJpbmstMCBpdGVtcy1jZW50ZXIgZ2FwLTEgcm" +
      "91bmRlZC1mdWxsIGJnLWFtYmVyLTUwIHB4LTIuNSBweS0xIHRleHQtWzEwcHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZSB0" +
      "ZXh0LWFtYmVyLTcwMCI+DQogICAgICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgc2l6ZT17MTJ9IC8+IFBlbmRlbnRlDQogICAgICAgICAgIC" +
      "AgIDwvc3Bhbj4NCiAgICAgICAgICAgIDwvZGl2Pg0KDQogICAgICAgICAgICA8YnV0dG9uDQogICAgICAgICAgICAgIHR5cGU9ImJ1dHRvbiIN" +
      "CiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2VsZWNpb25hZG9JZChpdGVtLmlkKX0NCiAgICAgICAgICAgICAgZGlzYWJsZWQ9ey" +
      "Fwb2RlUmVnaXN0cmFyfQ0KICAgICAgICAgICAgICBjbGFzc05hbWU9Im10LTMgaW5saW5lLWZsZXggbWluLWgtMTAgdy1mdWxsIGl0ZW1zLWNl" +
      "bnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiByb3VuZGVkLXhsIGJnLWFtYmVyLTYwMCBweC0zIHB5LTIgdGV4dC14cyBmb250LWJvbGQgdGV4dC" +
      "13aGl0ZSB0cmFuc2l0aW9uIGhvdmVyOmJnLWFtYmVyLTcwMCBkaXNhYmxlZDpjdXJzb3Itbm90LWFsbG93ZWQgZGlzYWJsZWQ6Ymctc2xhdGUt" +
      "MjAwIGRpc2FibGVkOnRleHQtc2xhdGUtNTAwIg0KICAgICAgICAgICAgPg0KICAgICAgICAgICAgICA8QWN0aXZpdHkgY2xhc3NOYW1lPSJzaX" +
      "plLTQiIC8+DQogICAgICAgICAgICAgIHtwb2RlUmVnaXN0cmFyID8gIlJlZ2lzdHJhciBldm9sdcOnw6NvIiA6ICJTZW0gcGVybWlzc8OjbyBj" +
      "bMOtbmljYSJ9DQogICAgICAgICAgICA8L2J1dHRvbj4NCiAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgKSl9DQogICAgICA8L2Rpdj4NCg0KIC" +
      "AgICAgPFJlZ2lzdHJhckV2b2x1Y2FvUGVuZGVudGVNb2RhbA0KICAgICAgICBvcGVuPXtCb29sZWFuKHNlbGVjaW9uYWRvKX0NCiAgICAgICAg" +
      "aXRlbT17c2VsZWNpb25hZG99DQogICAgICAgIHRlbVByb3hpbWE9e3BlbmRlbnRlcy5sZW5ndGggPiAxfQ0KICAgICAgICBvbkNsb3NlPXsoKS" +
      "A9PiBzZXRTZWxlY2lvbmFkb0lkKG51bGwpfQ0KICAgICAgICBvblNhdmVkPXtjb25jbHVpcn0NCiAgICAgIC8+DQogICAgPC8+DQogICk7DQp9" +
      "DQo=",
  },
];

const faltando = arquivos.filter((item) => !existsSync(item.caminho));
if (faltando.length > 0) {
  console.error("ERRO: nao encontrei estes arquivos do projeto:\n");
  faltando.forEach((item) => console.error("   - " + item.caminho));
  console.error("");
  process.exit(1);
}

let mudou = 0;
let jaEstava = 0;

for (const alvo of arquivos) {
  const atual = readFileSync(alvo.caminho, "utf8");
  const usaCRLF = atual.includes("\r\n");
  const novo = Buffer.from(alvo.conteudo, "base64").toString("utf8");
  const saida = usaCRLF
    ? novo.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")
    : novo.replace(/\r\n/g, "\n");

  if (atual === saida) {
    jaEstava += 1;
    console.log("  [pulou] " + alvo.rotulo + " (ja estava aplicada)");
    continue;
  }

  writeFileSync(alvo.caminho, saida, "utf8");
  mudou += 1;
  console.log("  [ok]    " + alvo.rotulo);
}

console.log(
  "\nPronto! " + mudou + " alteracao(oes) aplicada(s)" +
    (jaEstava > 0 ? ", " + jaEstava + " ja estava(m) no lugar" : "") + ".\n",
);
console.log("Agora rode:  npm run build\n");
