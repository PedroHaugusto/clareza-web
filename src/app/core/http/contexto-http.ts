import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marca uma requisicao cujo 401 nao deve deslogar nem redirecionar.
 *
 * Existe por causa do boot: a restauracao da sessao chama `GET /api/auth/eu` antes do router
 * ter iniciado a primeira navegacao, e um 401 ali e o resultado esperado de um token vencido —
 * nao um evento de "sua sessao acabou agora". Quem trata e o proprio `restaurarSessao`,
 * limpando o token; o `authGuard` cuida do resto.
 */
export const IGNORAR_SESSAO_EXPIRADA = new HttpContextToken<boolean>(() => false);

export function semTratamentoDeSessao(): HttpContext {
  return new HttpContext().set(IGNORAR_SESSAO_EXPIRADA, true);
}
