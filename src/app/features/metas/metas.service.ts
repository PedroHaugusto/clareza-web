import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MetaFinanceira, RequisicaoDeMeta } from '../../api/contratos';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MetasService {
  private readonly http = inject(HttpClient);

  listar(): Observable<MetaFinanceira[]> {
    return this.http.get<MetaFinanceira[]>(`${environment.urlDaApi}/api/metas`);
  }

  criar(dados: RequisicaoDeMeta): Observable<MetaFinanceira> {
    return this.http.post<MetaFinanceira>(`${environment.urlDaApi}/api/metas`, dados);
  }

  /**
   * Nao existe endpoint de aporte incremental: atualizar o progresso e mandar o `valorAtual`
   * novo junto do resto da meta.
   */
  editar(id: number, dados: RequisicaoDeMeta): Observable<MetaFinanceira> {
    return this.http.put<MetaFinanceira>(`${environment.urlDaApi}/api/metas/${id}`, dados);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.urlDaApi}/api/metas/${id}`);
  }
}
