import type {
  Agendamento,
  Auditoria,
  Automacao,
  BackupRegistro,
  CampanhaMarketing,
  Cliente as PrismaCliente,
  ConfiguracaoClinica,
  Fornecedor,
  Lancamento,
  Lead,
  MovimentacaoEstoque,
  Perfil,
  Permissao,
  Produto,
  Usuario,
} from "@prisma/client";

export type Cliente = PrismaCliente;
export type ClienteDTO = PrismaCliente;
export type AgendamentoDTO = Agendamento;
export type LancamentoDTO = Lancamento;
export type ProdutoDTO = Produto;
export type FornecedorDTO = Fornecedor;
export type MovimentacaoEstoqueDTO = MovimentacaoEstoque & { produto: Produto };
export type LeadDTO = Lead;
export type CampanhaMarketingDTO = CampanhaMarketing;
export type UsuarioDTO = Usuario & { perfil: Perfil | null };
export type PerfilDTO = Perfil;
export type PermissaoDTO = Permissao;
export type AuditoriaDTO = Auditoria;
export type ConfiguracaoClinicaDTO = ConfiguracaoClinica;
export type BackupRegistroDTO = BackupRegistro;
export type AutomacaoDTO = Automacao;

export type EstoqueProduto = Produto & {
  fornecedor: Fornecedor | null;
};

export type MoneyInput = number;
