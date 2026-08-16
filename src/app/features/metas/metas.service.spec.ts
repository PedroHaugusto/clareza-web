import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { InvestimentosService } from './investimentos.service';
import { MetasService } from './metas.service';

describe('servicos de metas e investimentos', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('MetasService', () => {
    const rota = `${environment.urlDaApi}/api/metas`;

    it('criaUmaMetaComPrazoOpcional', () => {
      TestBed.inject(MetasService).criar({ nome: 'Viagem', valorObjetivo: 10000 }).subscribe();

      const requisicao = http.expectOne(rota);
      expect(requisicao.request.method).toBe('POST');
      expect(requisicao.request.body).toEqual({ nome: 'Viagem', valorObjetivo: 10000 });
      requisicao.flush({ id: 1, nome: 'Viagem' });
    });

    it('atualizaOProgressoPeloPut', () => {
      // Nao ha endpoint de aporte incremental: o novo valorAtual vai junto do resto.
      TestBed.inject(MetasService)
        .editar(1, { nome: 'Viagem', valorObjetivo: 10000, valorAtual: 2500 })
        .subscribe();

      const requisicao = http.expectOne(`${rota}/1`);
      expect(requisicao.request.method).toBe('PUT');
      expect(requisicao.request.body.valorAtual).toBe(2500);
      requisicao.flush({ id: 1, valorAtual: 2500 });
    });

    it('excluiPeloId', () => {
      TestBed.inject(MetasService).excluir(1).subscribe();

      const requisicao = http.expectOne(`${rota}/1`);
      expect(requisicao.request.method).toBe('DELETE');
      requisicao.flush(null);
    });
  });

  describe('InvestimentosService', () => {
    const rota = `${environment.urlDaApi}/api/investimentos`;
    const rotaDoAporte = `${environment.urlDaApi}/api/meta-aporte`;

    it('trazACarteiraJaConsolidada', () => {
      let carteira: { totalInvestido?: number } = {};
      TestBed.inject(InvestimentosService)
        .carteira()
        .subscribe((recebida) => (carteira = recebida));

      http.expectOne(rota).flush({
        totalInvestido: 51000,
        rentabilidadeMediaPonderada: 11.27,
        quantidade: 2,
        investimentos: [],
      });

      expect(carteira.totalInvestido).toBe(51000);
    });

    it('aceitaRentabilidadeNegativa', () => {
      TestBed.inject(InvestimentosService)
        .criar({ nome: 'Cripto', tipo: 'CRIPTO', valorInvestido: 1000, rentabilidadeInformada: -8.5 })
        .subscribe();

      const requisicao = http.expectOne(rota);
      expect(requisicao.request.body.rentabilidadeInformada).toBe(-8.5);
      requisicao.flush({ id: 3 });
    });

    it('leDefineERemoveAMetaDeAporte', () => {
      const servico = TestBed.inject(InvestimentosService);

      servico.metaDeAporte().subscribe();
      http.expectOne(rotaDoAporte).flush({ valor: null, definida: false });

      servico.definirMetaDeAporte(800).subscribe();
      const definicao = http.expectOne(rotaDoAporte);
      expect(definicao.request.method).toBe('PUT');
      expect(definicao.request.body).toEqual({ valor: 800 });
      definicao.flush({ valor: 800, definida: true });

      servico.removerMetaDeAporte().subscribe();
      const remocao = http.expectOne(rotaDoAporte);
      expect(remocao.request.method).toBe('DELETE');
      remocao.flush(null);
    });
  });
});
