import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Cenario,
  PreferenciaDeCenario,
  Previsao,
  RequisicaoDePreferencia,
} from '../../api/contratos';
import { environment } from '../../../environments/environment';

/** A API aceita **apenas** 6 ou 12; outro valor responde 422. */
export type Horizonte = 6 | 12;

export interface ConsultaDePrevisao {
  meses: Horizonte;
  cenario: Cenario;
  /** Sobrescrevem a preferencia salva **sem persistir** — e o modo de pre-visualizacao. */
  ajusteReceita?: number;
  ajusteDespesa?: number;
}

@Injectable({ providedIn: 'root' })
export class PrevisaoService {
  private readonly http = inject(HttpClient);

  consultar(consulta: ConsultaDePrevisao): Observable<Previsao> {
    let parametros = new HttpParams()
      .set('meses', consulta.meses)
      .set('cenario', consulta.cenario);

    if (consulta.ajusteReceita !== undefined) {
      parametros = parametros.set('ajusteReceita', consulta.ajusteReceita);
    }
    if (consulta.ajusteDespesa !== undefined) {
      parametros = parametros.set('ajusteDespesa', consulta.ajusteDespesa);
    }

    return this.http.get<Previsao>(`${environment.urlDaApi}/api/previsao`, {
      params: parametros,
    });
  }

  /** Usuario que nunca configurou recebe 10 e 10, sem que nada tenha sido gravado. */
  preferencia(): Observable<PreferenciaDeCenario> {
    return this.http.get<PreferenciaDeCenario>(
      `${environment.urlDaApi}/api/preferencia-cenario`,
    );
  }

  salvarPreferencia(dados: RequisicaoDePreferencia): Observable<PreferenciaDeCenario> {
    return this.http.put<PreferenciaDeCenario>(
      `${environment.urlDaApi}/api/preferencia-cenario`,
      dados,
    );
  }
}
