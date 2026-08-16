import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequisicaoDeRecorrencia } from '../../api/contratos';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecorrenciasService {
  private readonly http = inject(HttpClient);

  /**
   * Criar uma recorrencia **materializa as ocorrencias como lancamentos reais**, ate 12 meses a
   * frente. Depois deste POST a listagem tera ~12 itens novos — quem chama precisa recarregar.
   */
  criar(dados: RequisicaoDeRecorrencia): Observable<unknown> {
    return this.http.post(`${environment.urlDaApi}/api/transacoes-recorrentes`, dados);
  }
}
