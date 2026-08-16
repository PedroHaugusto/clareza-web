import { components } from './tipos';

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
