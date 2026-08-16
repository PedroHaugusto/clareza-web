import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import {
  RequisicaoDeLogin,
  RequisicaoDeRegistro,
  RespostaDeAutenticacao,
  UsuarioLogado,
} from '../../api/contratos';
import { environment } from '../../../environments/environment';
import { semTratamentoDeSessao } from '../http/contexto-http';
import { ArmazenamentoDeSessao } from './armazenamento-de-sessao';

/**
 * Dono unico do estado de sessao.
 *
 * O token expira em 60 minutos e a API nao tem refresh: quem descobre que a sessao morreu e o
 * interceptor de erro, ao receber 401. Aqui so ficam os caminhos deliberados — entrar,
 * registrar, conferir quem esta logado e sair.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly armazenamento = inject(ArmazenamentoDeSessao);

  private readonly usuarioAtual = signal<UsuarioLogado | null>(null);

  readonly usuario = this.usuarioAtual.asReadonly();
  readonly autenticado = computed(() => this.usuarioAtual() !== null);

  registrar(dados: RequisicaoDeRegistro): Observable<RespostaDeAutenticacao> {
    // O registro ja devolve o token — nao existe uma chamada a /login depois desta.
    return this.http
      .post<RespostaDeAutenticacao>(`${environment.urlDaApi}/api/auth/registrar`, dados)
      .pipe(tap((resposta) => this.iniciarSessao(resposta)));
  }

  entrar(dados: RequisicaoDeLogin): Observable<RespostaDeAutenticacao> {
    return this.http
      .post<RespostaDeAutenticacao>(`${environment.urlDaApi}/api/auth/login`, dados)
      .pipe(tap((resposta) => this.iniciarSessao(resposta)));
  }

  /**
   * Fonte de verdade sobre quem esta logado.
   *
   * O token traz nome e e-mail nos claims, mas decodifica-lo exibiria dados de uma sessao que
   * pode ja ter expirado. Esta rota falha com 401 quando isso acontece.
   */
  carregarUsuario(opcoes?: { context?: HttpContext }): Observable<UsuarioLogado> {
    return this.http
      .get<UsuarioLogado>(`${environment.urlDaApi}/api/auth/eu`, { context: opcoes?.context })
      .pipe(tap((usuario) => this.usuarioAtual.set(usuario)));
  }

  /**
   * Restaura a sessao no boot da aplicacao. Nunca rejeita: token expirado, adulterado ou
   * servidor fora do ar deixam o usuario como visitante, mas nao impedem o app de subir.
   */
  restaurarSessao(): Observable<UsuarioLogado | null> {
    if (!this.armazenamento.lerToken()) {
      return of(null);
    }

    return this.carregarUsuario({ context: semTratamentoDeSessao() }).pipe(
      catchError(() => {
        this.encerrarSessao();
        return of(null);
      }),
    );
  }

  possuiToken(): boolean {
    return this.armazenamento.lerToken() !== null;
  }

  encerrarSessao(): void {
    this.armazenamento.limpar();
    this.usuarioAtual.set(null);
  }

  /**
   * A resposta de autenticacao traz id, nome e e-mail, mas nao `possuiSenha` nem
   * `vinculadoAoGoogle` — esses so existem em `GET /api/auth/eu`. Quando a tela de conta
   * precisar deles, chame `carregarUsuario()`; para entrar no app, o que ha aqui basta e
   * evita uma segunda ida ao servidor logo apos o login.
   */
  private iniciarSessao(resposta: RespostaDeAutenticacao): void {
    if (resposta.token) {
      this.armazenamento.guardarToken(resposta.token);
    }
    this.usuarioAtual.set({
      id: resposta.id,
      nome: resposta.nome,
      email: resposta.email,
    });
  }
}
