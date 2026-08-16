import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LancamentosService } from './lancamentos.service';

describe('LancamentosService', () => {
  let servico: LancamentosService;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/transacoes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(LancamentosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('naoEnviaNenhumParametro_quandoNaoHaFiltro', () => {
    servico.listar().subscribe();

    const requisicao = http.expectOne(rota);
    expect(requisicao.request.params.keys()).toHaveLength(0);
    requisicao.flush([]);
  });

  it('combinaOsFiltrosNaQuery', () => {
    servico.listar({ tipo: 'DESPESA', periodo: 'PROXIMOS_30_DIAS', busca: 'luz' }).subscribe();

    const requisicao = http.expectOne(
      (req) => req.url === rota && req.params.get('busca') === 'luz',
    );
    expect(requisicao.request.params.get('tipo')).toBe('DESPESA');
    expect(requisicao.request.params.get('periodo')).toBe('PROXIMOS_30_DIAS');
    requisicao.flush([]);
  });

  it('omiteOsCamposVazios_paraNaoMandarParametroEmBranco', () => {
    // `tipo=` nao e o mesmo que nao enviar `tipo`: a API responderia 400 no valor em branco.
    servico.listar({ tipo: '' as never, categoriaId: undefined, contaId: 3 }).subscribe();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.has('tipo')).toBe(false);
    expect(requisicao.request.params.has('categoriaId')).toBe(false);
    expect(requisicao.request.params.get('contaId')).toBe('3');
    requisicao.flush([]);
  });

  it('mantemOFiltroDeIdZero_seAlgumDiaExistir', () => {
    // Zero e valor legitimo: descartar por "falsy" seria bug silencioso.
    servico.listar({ categoriaId: 0 }).subscribe();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('categoriaId')).toBe('0');
    requisicao.flush([]);
  });
});
