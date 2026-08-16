import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Conta } from '../../api/contratos';
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
}
