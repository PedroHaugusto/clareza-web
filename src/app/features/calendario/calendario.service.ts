import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Calendario, Transacao } from '../../api/contratos';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  private readonly http = inject(HttpClient);

  /**
   * `mes` e `ano` sao opcionais — sem eles a API devolve o mes corrente. A resposta traz
   * **apenas os dias com lancamento**: a grade do mes e desenhada no cliente.
   */
  consultar(mes: number, ano: number): Observable<Calendario> {
    const parametros = new HttpParams().set('mes', mes).set('ano', ano);

    return this.http.get<Calendario>(`${environment.urlDaApi}/api/calendario`, {
      params: parametros,
    });
  }

  /**
   * Proximos 14 dias **e tambem o que ja venceu** e segue previsto, ordenado do mais urgente.
   * Confirmados nao aparecem.
   */
  vencimentos(): Observable<Transacao[]> {
    return this.http.get<Transacao[]>(`${environment.urlDaApi}/api/vencimentos`);
  }
}
