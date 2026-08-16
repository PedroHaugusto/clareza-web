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

/** Uma meta financeira. Os derivados (percentual, restante, prazo) ja vem calculados. */
export type MetaFinanceira = components['schemas']['RespostaMetaFinanceira'];
export type RequisicaoDeMeta = components['schemas']['RequisicaoDeMetaFinanceira'];

/** Carteira consolidada devolvida por `GET /api/investimentos`. */
export type Carteira = components['schemas']['RespostaCarteira'];
export type Investimento = components['schemas']['RespostaInvestimento'];
export type RequisicaoDeInvestimento = components['schemas']['RequisicaoDeInvestimento'];

/**
 * Unica excecao ao `non_null` da API: `valor` sempre aparece, podendo vir nulo, acompanhado
 * de `definida`.
 */
export type MetaDeAporte = components['schemas']['RespostaMetaAporte'];

export type TipoInvestimento = RequisicaoDeInvestimento['tipo'];

/** Corpo de `GET /api/previsao` — o cenario aplicado e os meses projetados. */
export type Previsao = components['schemas']['RespostaPrevisao'];

/** Um mes projetado. O `saldoProjetado` de um mes e o `saldoInicial` do proximo. */
export type PrevisaoMensal = components['schemas']['RespostaPrevisaoMensal'];

export type PreferenciaDeCenario = components['schemas']['RespostaPreferenciaCenario'];
export type RequisicaoDePreferencia = components['schemas']['RequisicaoDePreferenciaCenario'];

/** Corpo de `GET /api/fluxo-caixa` — serie continua de passado e futuro. */
export type FluxoDeCaixa = components['schemas']['RespostaFluxoDeCaixa'];
export type FluxoMensal = components['schemas']['RespostaFluxoMensal'];

export type Cenario = NonNullable<Previsao['cenario']>;

/** Corpo de `GET /api/calendario` — totais do mes e os dias que tem lancamento. */
export type Calendario = components['schemas']['RespostaCalendario'];

/** Um dia com movimento. Dias sem lancamento **nao vem** na resposta. */
export type DiaDoCalendario = components['schemas']['RespostaDia'];

export type RequisicaoDeCategoria = components['schemas']['RequisicaoDeCategoria'];
export type RequisicaoDeConta = components['schemas']['RequisicaoDeConta'];

export type TipoTransacao = NonNullable<Transacao['tipo']>;
export type Periodicidade = RequisicaoDeRecorrencia['periodicidade'];
export type TipoCategoria = RequisicaoDeCategoria['tipo'];
export type TipoConta = RequisicaoDeConta['tipo'];
export type StatusTransacao = NonNullable<Transacao['status']>;
export type PeriodoDeBusca = NonNullable<FiltroDeTransacoes['periodo']>;
