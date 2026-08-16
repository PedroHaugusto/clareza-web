import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ArmazenamentoDeSessao } from '../sessao/armazenamento-de-sessao';
import { ehRotaPublica } from './rotas-publicas';

/**
 * Injeta `Authorization: Bearer` nas chamadas da API.
 *
 * Dois filtros importam:
 * - so a URL da API recebe o token, para nao vazar credencial em requisicao a terceiros;
 * - as rotas publicas ficam de fora, senao um token velho viajaria junto de um login novo.
 */
export const tokenInterceptor: HttpInterceptorFn = (requisicao, proxima) => {
  const armazenamento = inject(ArmazenamentoDeSessao);

  const paraNossaApi = requisicao.url.startsWith(environment.urlDaApi);
  if (!paraNossaApi || ehRotaPublica(requisicao.url)) {
    return proxima(requisicao);
  }

  const token = armazenamento.lerToken();
  if (!token) {
    return proxima(requisicao);
  }

  return proxima(
    requisicao.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
