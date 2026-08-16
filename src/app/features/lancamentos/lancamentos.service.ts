import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FiltroDeTransacoes,
  RequisicaoDeParcelamento,
  RequisicaoDeTransacao,
  Transacao,
} from '../../api/contratos';
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

  criar(dados: RequisicaoDeTransacao): Observable<Transacao> {
    return this.http.post<Transacao>(`${environment.urlDaApi}/api/transacoes`, dados);
  }

  /** Devolve **array**: as N parcelas criadas, cada uma um lancamento comum. */
  criarParcelado(dados: RequisicaoDeParcelamento): Observable<Transacao[]> {
    return this.http.post<Transacao[]>(
      `${environment.urlDaApi}/api/transacoes/parcelada`,
      dados,
    );
  }

  editar(id: number, dados: RequisicaoDeTransacao): Observable<Transacao> {
    return this.http.put<Transacao>(`${environment.urlDaApi}/api/transacoes/${id}`, dados);
  }

  /** Marca como pago/recebido. Confirmar duas vezes responde 422. */
  confirmar(id: number): Observable<Transacao> {
    return this.http.patch<Transacao>(
      `${environment.urlDaApi}/api/transacoes/${id}/confirmar`,
      null,
    );
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.urlDaApi}/api/transacoes/${id}`);
  }
}
