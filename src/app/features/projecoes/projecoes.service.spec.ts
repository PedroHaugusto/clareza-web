import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FluxoDeCaixaService } from './fluxo-de-caixa.service';
import { PrevisaoService } from './previsao.service';

describe('servicos de projecao', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('PrevisaoService', () => {
    const rota = `${environment.urlDaApi}/api/previsao`;

    it('envia horizonteECenario', () => {
      TestBed.inject(PrevisaoService).consultar({ meses: 12, cenario: 'OTIMISTA' }).subscribe();

      const requisicao = http.expectOne((req) => req.url === rota);
      expect(requisicao.request.params.get('meses')).toBe('12');
      expect(requisicao.request.params.get('cenario')).toBe('OTIMISTA');
      requisicao.flush({ meses: [] });
    });

    it('omiteOsAjustes_quandoUsaAPreferenciaSalva', () => {
      TestBed.inject(PrevisaoService).consultar({ meses: 6, cenario: 'PROVAVEL' }).subscribe();

      const requisicao = http.expectOne((req) => req.url === rota);
      expect(requisicao.request.params.has('ajusteReceita')).toBe(false);
      expect(requisicao.request.params.has('ajusteDespesa')).toBe(false);
      requisicao.flush({ meses: [] });
    });

    it('mandaOsAjustesNaQuery_noModoPreVisualizacao', () => {
      TestBed.inject(PrevisaoService)
        .consultar({ meses: 6, cenario: 'OTIMISTA', ajusteReceita: 20, ajusteDespesa: 5 })
        .subscribe();

      const requisicao = http.expectOne((req) => req.url === rota);
      // Sobrescrevem a preferencia salva sem gravar nada.
      expect(requisicao.request.params.get('ajusteReceita')).toBe('20');
      expect(requisicao.request.params.get('ajusteDespesa')).toBe('5');
      requisicao.flush({ meses: [] });
    });

    it('mandaAjusteZero_emVezDeOmitir', () => {
      // Zero e "sem ajuste nenhum", que e diferente de "usa o que estiver salvo".
      TestBed.inject(PrevisaoService)
        .consultar({ meses: 6, cenario: 'OTIMISTA', ajusteReceita: 0, ajusteDespesa: 0 })
        .subscribe();

      const requisicao = http.expectOne((req) => req.url === rota);
      expect(requisicao.request.params.get('ajusteReceita')).toBe('0');
      requisicao.flush({ meses: [] });
    });

    it('leEGravaAPreferencia', () => {
      const servico = TestBed.inject(PrevisaoService);

      servico.preferencia().subscribe();
      http
        .expectOne(`${environment.urlDaApi}/api/preferencia-cenario`)
        .flush({ percentualAjusteReceita: 10, percentualAjusteDespesa: 10 });

      servico
        .salvarPreferencia({ percentualAjusteReceita: 20, percentualAjusteDespesa: 5 })
        .subscribe();
      const gravacao = http.expectOne(`${environment.urlDaApi}/api/preferencia-cenario`);
      expect(gravacao.request.method).toBe('PUT');
      gravacao.flush({ percentualAjusteReceita: 20, percentualAjusteDespesa: 5 });
    });
  });

  describe('FluxoDeCaixaService', () => {
    it('enviaAJanelaDosDoisLados', () => {
      TestBed.inject(FluxoDeCaixaService).consultar(6, 12).subscribe();

      const requisicao = http.expectOne(
        (req) => req.url === `${environment.urlDaApi}/api/fluxo-caixa`,
      );
      expect(requisicao.request.params.get('mesesPassados')).toBe('6');
      expect(requisicao.request.params.get('mesesFuturos')).toBe('12');
      requisicao.flush({ saldoAnterior: 0, meses: [] });
    });
  });
});
