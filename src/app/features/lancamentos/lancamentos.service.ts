import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FiltroDeTransacoes, Transacao } from '../../api/contratos';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LancamentosService {
  private readonly http = inject(HttpClient);

  /**
   * Os filtros sao combinaveis e todos opcionais. Campo vazio precisa ficar **fora** da query:
   * `tipo=` nao e o mesmo que nao enviar `tipo`, e a API responderia 400 no valor em branco.
   */
  listar(filtros: FiltroDeTransacoes = {}): Observable<Transacao[]> {
    let parametros = new HttpParams();

    for (const [nome, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        parametros = parametros.set(nome, String(valor));
      }
    }

    return this.http.get<Transacao[]>(`${environment.urlDaApi}/api/transacoes`, {
      params: parametros,
    });
  }
}
