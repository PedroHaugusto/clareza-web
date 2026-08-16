import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VisaoGeral } from '../../api/contratos';
import { environment } from '../../../environments/environment';
import { VisaoGeralService } from './visao-geral.service';

describe('VisaoGeralService', () => {
  let servico: VisaoGeralService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(VisaoGeralService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('buscaOPainelInteiroEmUmaChamadaSo', () => {
    let recebido: VisaoGeral | null = null;
    servico.consultar().subscribe((visao) => (recebido = visao));

    const requisicao = http.expectOne(`${environment.urlDaApi}/api/visao-geral`);
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({
      saldoDisponivel: 3710.1,
      saldoRealizado: 3800,
      mesAtual: { mes: 8, ano: 2026, saldoDoMes: 3710.1 },
      proximosMeses: [{ mes: 9, ano: 2026, saldoDoMes: 0 }],
    });

    expect(recebido!.saldoDisponivel).toBe(3710.1);
    expect(recebido!.proximosMeses).toHaveLength(1);
  });
});
