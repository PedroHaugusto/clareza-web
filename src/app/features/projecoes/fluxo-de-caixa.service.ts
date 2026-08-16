import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FluxoDeCaixa } from '../../api/contratos';
import { environment } from '../../../environments/environment';

/** Cada lado da janela aceita ate 24 meses. */
export const MAXIMO_DE_MESES = 24;

@Injectable({ providedIn: 'root' })
export class FluxoDeCaixaService {
  private readonly http = inject(HttpClient);

  consultar(mesesPassados: number, mesesFuturos: number): Observable<FluxoDeCaixa> {
    const parametros = new HttpParams()
      .set('mesesPassados', mesesPassados)
      .set('mesesFuturos', mesesFuturos);

    return this.http.get<FluxoDeCaixa>(`${environment.urlDaApi}/api/fluxo-caixa`, {
      params: parametros,
    });
  }
}
