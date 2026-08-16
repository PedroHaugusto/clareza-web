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

  describe('escrita', () => {
    const lancamento = {
      contaId: 1,
      categoriaId: 2,
      descricao: 'Conta de luz',
      valor: 89.9,
      tipo: 'DESPESA' as const,
      dataPrevista: '2026-08-28',
    };

    it('criaUmLancamentoSimples', () => {
      servico.criar(lancamento).subscribe();

      const requisicao = http.expectOne(rota);
      expect(requisicao.request.method).toBe('POST');
      expect(requisicao.request.body).toEqual(lancamento);
      requisicao.flush({ id: 9, ...lancamento, status: 'PREVISTA' });
    });

    it('criaAsParcelasEmUmaChamadaSo', () => {
      let recebidas: unknown[] = [];
      servico
        .criarParcelado({
          contaId: 1,
          categoriaId: 2,
          descricao: 'Curso',
          valorTotal: 100,
          tipo: 'DESPESA',
          dataDaPrimeiraParcela: '2026-09-01',
          totalParcelas: 3,
        })
        .subscribe((parcelas) => (recebidas = parcelas));

      const requisicao = http.expectOne(`${rota}/parcelada`);
      expect(requisicao.request.method).toBe('POST');
      // A diferenca de centavos fica na ultima, e a soma fecha o total exato.
      requisicao.flush([{ valor: 33.33 }, { valor: 33.33 }, { valor: 33.34 }]);

      expect(recebidas).toHaveLength(3);
    });

    it('editaPeloId', () => {
      servico.editar(9, lancamento).subscribe();

      const requisicao = http.expectOne(`${rota}/9`);
      expect(requisicao.request.method).toBe('PUT');
      requisicao.flush({ id: 9, ...lancamento });
    });

    it('confirmaSemCorpo', () => {
      servico.confirmar(9).subscribe();

      const requisicao = http.expectOne(`${rota}/9/confirmar`);
      expect(requisicao.request.method).toBe('PATCH');
      requisicao.flush({ id: 9, status: 'CONFIRMADA' });
    });

    it('excluiPeloId', () => {
      servico.excluir(9).subscribe();

      const requisicao = http.expectOne(`${rota}/9`);
      expect(requisicao.request.method).toBe('DELETE');
      requisicao.flush(null);
    });
  });
});
