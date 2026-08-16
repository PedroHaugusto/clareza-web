import { components, operations } from './tipos';

/**
 * Apelidos legiveis para os schemas gerados do OpenAPI.
 *
 * O `tipos.ts` e gerado por `npm run gerar:tipos` e nao deve ser editado a mao. Importar
 * sempre os apelidos daqui: assim uma renomeacao no backend quebra em um arquivo so.
 *
 * O `openapi-typescript` fica fora das devDependencies de proposito — ele pede peer
 * `typescript@^5.x` e o projeto usa a linha 6. O script chama via `npx`, que resolve a
 * propria arvore isolada, em vez de forcar `--legacy-peer-deps` no projeto inteiro.
 *
 * Os campos de resposta vem opcionais porque a API serializa com `non_null`: campo sem
 * valor nao aparece no JSON, em vez de vir `null`. Nao "corrigir" para `| null`.
 */

/** Corpo devolvido por registrar, entrar e login com Google — ja traz o token. */
export type RespostaDeAutenticacao = components['schemas']['RespostaAutenticacao'];

/** Corpo de `GET /api/auth/eu` — o dado de sessao verificado pelo servidor. */
export type UsuarioLogado = components['schemas']['RespostaUsuario'];

export type RequisicaoDeRegistro = components['schemas']['RequisicaoDeRegistro'];
export type RequisicaoDeLogin = components['schemas']['RequisicaoDeLogin'];

/** Corpo de `GET /api/visao-geral` — os dois saldos, o mes atual e os proximos tres. */
export type VisaoGeral = components['schemas']['RespostaVisaoGeral'];

/** Fechamento de um mes: realizado, previsto e o total de cada lado. */
export type ResumoDoMes = components['schemas']['RespostaResumoDoMes'];

/** Um lancamento. `valor` e sempre positivo — o sinal vem de `tipo`. */
export type Transacao = components['schemas']['RespostaTransacao'];

export type Categoria = components['schemas']['RespostaCategoria'];
export type Conta = components['schemas']['RespostaConta'];

/**
 * Filtros de `GET /api/transacoes`, todos opcionais e combinaveis. Tirados da operacao gerada
 * para nao existir uma segunda definicao dos valores aceitos.
 */
export type FiltroDeTransacoes = NonNullable<operations['listar']['parameters']['query']>;

export type RequisicaoDeTransacao = components['schemas']['RequisicaoDeTransacao'];
export type RequisicaoDeParcelamento = components['schemas']['RequisicaoDeParcelamento'];
export type RequisicaoDeRecorrencia = components['schemas']['RequisicaoDeRecorrencia'];

export type RequisicaoDeCategoria = components['schemas']['RequisicaoDeCategoria'];
export type RequisicaoDeConta = components['schemas']['RequisicaoDeConta'];

export type TipoTransacao = NonNullable<Transacao['tipo']>;
export type Periodicidade = RequisicaoDeRecorrencia['periodicidade'];
export type TipoCategoria = RequisicaoDeCategoria['tipo'];
export type TipoConta = RequisicaoDeConta['tipo'];
export type StatusTransacao = NonNullable<Transacao['status']>;
export type PeriodoDeBusca = NonNullable<FiltroDeTransacoes['periodo']>;
