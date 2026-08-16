import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { VisaoGeral } from '../../api/contratos';
import { environment } from '../../../environments/environment';

/**
 * Uma chamada so entrega o painel inteiro: os dois saldos, o fechamento do mes atual e os
 * proximos tres meses. Nao ha nada para compor no cliente.
 */
@Injectable({ providedIn: 'root' })
export class VisaoGeralService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<VisaoGeral> {
    return this.http.get<VisaoGeral>(`${environment.urlDaApi}/api/visao-geral`);
  }
}
