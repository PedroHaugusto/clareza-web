import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { normalizarErro } from '../../api/erro-da-api';
import { AuthService } from '../sessao/auth.service';
import { IGNORAR_SESSAO_EXPIRADA } from './contexto-http';
import { ehTentativaDeAutenticacao } from './rotas-publicas';

/**
 * Traduz toda falha para o formato unico da API e trata a sessao expirada em um lugar so.
 *
 * O token vale 60 minutos e nao ha refresh: o usuario sera deslogado no meio do uso. Reagir ao
 * 401 aqui e o que separa "voce foi deslogado" de "a tela quebrou".
 */
export const erroInterceptor: HttpInterceptorFn = (requisicao, proxima) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return proxima(requisicao).pipe(
    catchError((falha: HttpErrorResponse) => {
      const erro = normalizarErro(falha);

      // Um 401 no proprio login significa credencial errada, nao sessao expirada. Redirecionar
      // aqui faria a tela de login navegar para si mesma e engolir a mensagem de erro.
      const tratarSessao =
        !ehTentativaDeAutenticacao(requisicao.url) &&
        !requisicao.context.get(IGNORAR_SESSAO_EXPIRADA);

      if (erro.status === 401 && tratarSessao) {
        auth.encerrarSessao();
        void router.navigate(['/login']);
      }

      return throwError(() => erro);
    }),
  );
};
