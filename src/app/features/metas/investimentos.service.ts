import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Carteira,
  Investimento,
  MetaDeAporte,
  RequisicaoDeInvestimento,
} from '../../api/contratos';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvestimentosService {
  private readonly http = inject(HttpClient);

  /**
   * A listagem ja vem consolidada: total investido, rentabilidade media ponderada pelo valor e
   * a quantidade. Nao ha nada para somar no cliente.
   */
  carteira(): Observable<Carteira> {
    return this.http.get<Carteira>(`${environment.urlDaApi}/api/investimentos`);
  }

  criar(dados: RequisicaoDeInvestimento): Observable<Investimento> {
    return this.http.post<Investimento>(`${environment.urlDaApi}/api/investimentos`, dados);
  }

  editar(id: number, dados: RequisicaoDeInvestimento): Observable<Investimento> {
    return this.http.put<Investimento>(
      `${environment.urlDaApi}/api/investimentos/${id}`,
      dados,
    );
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.urlDaApi}/api/investimentos/${id}`);
  }

  /** Um unico valor por usuario. Sem nada definido, devolve `{ valor: null, definida: false }`. */
  metaDeAporte(): Observable<MetaDeAporte> {
    return this.http.get<MetaDeAporte>(`${environment.urlDaApi}/api/meta-aporte`);
  }

  definirMetaDeAporte(valor: number): Observable<MetaDeAporte> {
    return this.http.put<MetaDeAporte>(`${environment.urlDaApi}/api/meta-aporte`, { valor });
  }

  removerMetaDeAporte(): Observable<void> {
    return this.http.delete<void>(`${environment.urlDaApi}/api/meta-aporte`);
  }
}
