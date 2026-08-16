import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Conta, RequisicaoDeConta } from '../../api/contratos';
import { environment } from '../../../environments/environment';

/**
 * Contas e cartoes sao a **mesma entidade**, diferenciados por `tipo`. Para decidir icone ou
 * rotulo, use `cartaoDeCredito` em vez de comparar a string do enum.
 */
@Injectable({ providedIn: 'root' })
export class ContaService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Conta[]> {
    return this.http.get<Conta[]>(`${environment.urlDaApi}/api/contas`);
  }

  criar(dados: RequisicaoDeConta): Observable<Conta> {
    return this.http.post<Conta>(`${environment.urlDaApi}/api/contas`, dados);
  }

  /** Conta com lancamentos nao pode ser excluida: responde 422. */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.urlDaApi}/api/contas/${id}`);
  }
}
