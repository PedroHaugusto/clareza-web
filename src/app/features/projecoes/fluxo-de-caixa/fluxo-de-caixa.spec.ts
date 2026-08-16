import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { prepararCanvasParaTeste } from '../../../core/graficos/canvas.testing';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { FluxoDeCaixa } from './fluxo-de-caixa';

registerLocaleData(localePt, 'pt-BR');

describe('FluxoDeCaixa', () => {
  let fixture: ComponentFixture<FluxoDeCaixa>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/fluxo-caixa`;

  const fluxo = {
    saldoAnterior: 1500,
    meses: [
      { mes: 7, ano: 2026, entradas: 5000, saidas: 4200, saldoDoMes: 800, saldoAcumulado: 2300 },
      { mes: 8, ano: 2026, entradas: 5000, saidas: 1852.7, saldoDoMes: 3147.3, saldoAcumulado: 5447.3 },
    ],
  };

  const criarEResponder = (corpo: object = fluxo) => {
    fixture = TestBed.createComponent(FluxoDeCaixa);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne((req) => req.url === rota).flush(corpo);
    fixture.detectChanges();
  };

  const clicarEm = (rotulo: string, ocorrencia = 0) => {
    const botoes = [...elemento.querySelectorAll('button')].filter(
      (candidato) => candidato.textContent?.trim() === rotulo,
    );
    botoes[ocorrencia].click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    prepararCanvasParaTeste();

    await TestBed.configureTestingModule({
      imports: [FluxoDeCaixa],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('abreComSeisMesesParaCadaLado', () => {
    fixture = TestBed.createComponent(FluxoDeCaixa);
    fixture.detectChanges();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('mesesPassados')).toBe('6');
    expect(requisicao.request.params.get('mesesFuturos')).toBe('6');
    requisicao.flush(fluxo);
  });

  it('naoOfereceJanelaMaiorQueOLimiteDaApi', () => {
    criarEResponder();

    const janelas = [...elemento.querySelectorAll('section:first-of-type button')].map((botao) =>
      Number(botao.textContent?.trim()),
    );
    // Cada lado aceita ate 24 meses.
    expect(Math.max(...janelas)).toBeLessThanOrEqual(24);
  });

  it('trocaAJanelaDoPassado', () => {
    criarEResponder();

    clicarEm('12');

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('mesesPassados')).toBe('12');
    expect(requisicao.request.params.get('mesesFuturos')).toBe('6');
    requisicao.flush(fluxo);
    fixture.detectChanges();
  });

  it('explicaDeOndeACurvaParte', () => {
    criarEResponder();

    // Sem o saldo anterior, o grafico comecaria do zero como se nao houvesse passado.
    expect(elemento.textContent).toContain('1.500,00');
    expect(elemento.textContent).toContain('ja existia antes desta janela');
  });

  it('dizQueNaoHaviaSaldo_quandoOAnteriorEZero', () => {
    criarEResponder({ ...fluxo, saldoAnterior: 0 });

    expect(elemento.textContent).toContain('Nao havia saldo antes desta janela');
  });

  it('mostraAcumuladoNaTabela', () => {
    criarEResponder();

    const linhas = [...elemento.querySelectorAll('tbody tr')];
    expect(linhas).toHaveLength(2);
    expect(linhas[0].textContent).toContain('2.300,00');
    expect(linhas[1].textContent).toContain('5.447,30');
  });

  it('temLegendaNoGraficoDeDuasSeries', () => {
    criarEResponder();

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Entradas');
    expect(texto).toContain('Saidas');
  });

  it('avisa_quandoNaoHaMovimentoNaJanela', () => {
    criarEResponder({ saldoAnterior: 0, meses: [] });

    expect(elemento.textContent).toContain('Nao ha movimento nesta janela');
  });

  it('ofereceTentarDeNovo_quandoAConsultaFalha', () => {
    fixture = TestBed.createComponent(FluxoDeCaixa);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http
      .expectOne((req) => req.url === rota)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Erro' });
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('servidor');
    clicarEm('Tentar de novo');
    http.expectOne((req) => req.url === rota).flush(fluxo);
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Saldo acumulado');
  });
});
