import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CalendarioService } from './calendario.service';

describe('CalendarioService', () => {
  let servico: CalendarioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(CalendarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consultaOMesPedido', () => {
    servico.consultar(9, 2026).subscribe();

    const requisicao = http.expectOne(
      (req) => req.url === `${environment.urlDaApi}/api/calendario`,
    );
    expect(requisicao.request.params.get('mes')).toBe('9');
    expect(requisicao.request.params.get('ano')).toBe('2026');
    requisicao.flush({ mes: 9, ano: 2026, dias: [] });
  });

  it('buscaOsVencimentosSemParametro', () => {
    let recebidos: unknown[] = [];
    servico.vencimentos().subscribe((transacoes) => (recebidos = transacoes));

    const requisicao = http.expectOne(`${environment.urlDaApi}/api/vencimentos`);
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush([{ id: 1, descricao: 'Conta de luz' }]);

    expect(recebidos).toHaveLength(1);
  });
});
