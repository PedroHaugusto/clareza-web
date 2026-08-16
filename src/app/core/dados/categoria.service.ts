import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Categoria, RequisicaoDeCategoria } from '../../api/contratos';
import { environment } from '../../../environments/environment';

/**
 * Cadastro de apoio, consumido por mais de uma tela.
 *
 * Sem cache de proposito: a lista e pequena e vai mudar quando a tela de cadastros existir —
 * um cache eterno mostraria categoria recem-criada faltando, que e pior do que uma requisicao
 * a mais.
 */
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);

  /** Traz as do usuario **mais** as 7 padrao do sistema. */
  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${environment.urlDaApi}/api/categorias`);
  }

  /**
   * Nome duplicado responde 422 — a comparacao ignora maiusculas e considera tambem as
   * categorias globais. A cor volta normalizada para maiusculas (`#ad1457` vira `#AD1457`).
   */
  criar(dados: RequisicaoDeCategoria): Observable<Categoria> {
    return this.http.post<Categoria>(`${environment.urlDaApi}/api/categorias`, dados);
  }

  /** Categoria padrao do sistema nao pode ser excluida: responde 422. */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.urlDaApi}/api/categorias/${id}`);
  }
}
