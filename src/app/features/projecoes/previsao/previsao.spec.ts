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
import { Previsao } from './previsao';

registerLocaleData(localePt, 'pt-BR');

describe('Previsao', () => {
  let fixture: ComponentFixture<Previsao>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/previsao`;
  const rotaDaPreferencia = `${environment.urlDaApi}/api/preferencia-cenario`;

  const previsao = {
    cenario: 'PROVAVEL',
    percentualAjusteReceita: 10,
    percentualAjusteDespesa: 10,
    meses: [
      {
        mes: 9,
        ano: 2026,
        saldoInicial: 3147.3,
        totalReceitasPrevistas: 5000,
        totalDespesasPrevistas: 1233.33,
        saldoProjetado: 6913.97,
      },
      {
        mes: 10,
        ano: 2026,
        saldoInicial: 6913.97,
        totalReceitasPrevistas: 5000,
        totalDespesasPrevistas: 1233.33,
        saldoProjetado: 10680.64,
      },
    ],
  };

  const responderPreferencia = () =>
    http
      .expectOne(rotaDaPreferencia)
      .flush({ percentualAjusteReceita: 10, percentualAjusteDespesa: 10 });

  const criarEResponder = (corpo: object = previsao) => {
    fixture = TestBed.createComponent(Previsao);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    responderPreferencia();
    http.expectOne((req) => req.url === rota).flush(corpo);
    fixture.detectChanges();
  };

  const clicarEm = (rotulo: string) => {
    const botao = [...elemento.querySelectorAll('button')].find(
      (candidato) => candidato.textContent?.trim() === rotulo,
    );
    botao!.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    prepararCanvasParaTeste();

    await TestBed.configureTestingModule({
      imports: [Previsao],
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

  it('abreEmSeisMesesEProvavel', () => {
    fixture = TestBed.createComponent(Previsao);
    fixture.detectChanges();
    responderPreferencia();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('meses')).toBe('6');
    expect(requisicao.request.params.get('cenario')).toBe('PROVAVEL');
    requisicao.flush(previsao);
  });

  it('naoOfereceHorizonteQueAApiRecusa', () => {
    criarEResponder();

    const horizontes = [...elemento.querySelectorAll('button')]
      .map((botao) => botao.textContent?.trim())
      .filter((texto) => texto?.endsWith('meses'));
    // A API aceita apenas 6 ou 12: qualquer outro valor responde 422.
    expect(horizontes).toEqual(['6 meses', '12 meses']);
  });

  it('trocaOHorizonte', () => {
    criarEResponder();

    clicarEm('12 meses');

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('meses')).toBe('12');
    requisicao.flush(previsao);
    fixture.detectChanges();
  });

  it('escondeOsAjustes_noCenarioProvavel', () => {
    criarEResponder();

    // O cenario provavel usa os valores registrados, sem ajuste: nao ha o que regular.
    expect(elemento.querySelector('input[type="range"]')).toBeNull();
  });

  it('mostraOsAjustes_aoTrocarDeCenario', () => {
    criarEResponder();

    clicarEm('otimista');
    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('cenario')).toBe('OTIMISTA');
    // Sem mexer no slider, a consulta nao manda ajuste: vale a preferencia salva.
    expect(requisicao.request.params.has('ajusteReceita')).toBe(false);
    requisicao.flush({ ...previsao, cenario: 'OTIMISTA' });
    fixture.detectChanges();

    expect(elemento.querySelectorAll('input[type="range"]')).toHaveLength(2);
  });

  it('preVisualizaSemGravar_aoMexerNoSlider', () => {
    criarEResponder();

    clicarEm('otimista');
    http.expectOne((req) => req.url === rota).flush({ ...previsao, cenario: 'OTIMISTA' });
    fixture.detectChanges();

    const slider = elemento.querySelector('input[type="range"]') as HTMLInputElement;
    slider.value = '25';
    slider.dispatchEvent(new Event('input'));
    slider.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const requisicao = http.expectOne((req) => req.url === rota);
    expect(requisicao.request.params.get('ajusteReceita')).toBe('25');
    requisicao.flush({ ...previsao, cenario: 'OTIMISTA', percentualAjusteReceita: 25 });
    fixture.detectChanges();

    // Pre-visualizacao nao persiste: nenhum PUT saiu.
    http.expectNone(rotaDaPreferencia);
  });

  it('gravaSoQuandoOUsuarioPede', () => {
    criarEResponder();

    clicarEm('otimista');
    http.expectOne((req) => req.url === rota).flush({ ...previsao, cenario: 'OTIMISTA' });
    fixture.detectChanges();

    clicarEm('Salvar como padrao');

    const gravacao = http.expectOne(rotaDaPreferencia);
    expect(gravacao.request.method).toBe('PUT');
    expect(gravacao.request.body).toEqual({
      percentualAjusteReceita: 10,
      percentualAjusteDespesa: 10,
    });
    gravacao.flush({ percentualAjusteReceita: 10, percentualAjusteDespesa: 10 });
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Preferencia salva.');
  });

  it('explicaQueOAjusteValeParaOsTotais_eNaoParaCadaLancamento', () => {
    criarEResponder();

    clicarEm('otimista');
    http
      .expectOne((req) => req.url === rota)
      .flush({ ...previsao, cenario: 'OTIMISTA', percentualAjusteReceita: 20 });
    fixture.detectChanges();

    expect(elemento.textContent).toContain('cada lancamento');
    expect(elemento.textContent).toContain('valor registrado');
  });

  it('mostraATabelaComOSaldoEncadeado', () => {
    criarEResponder();

    const linhas = [...elemento.querySelectorAll('tbody tr')];
    expect(linhas).toHaveLength(2);
    // O saldo projetado de um mes abre o seguinte.
    expect(linhas[0].textContent).toContain('6.913,97');
    expect(linhas[1].textContent).toContain('6.913,97');
  });

  it('temLegendaNoGraficoDeDuasSeries', () => {
    criarEResponder();

    // Identidade nunca so pela cor: legenda ao lado do titulo.
    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Receitas e despesas por mes');
    expect(texto).toContain('Despesas');
  });

  it('avisa_quandoNaoHaNadaProgramado', () => {
    criarEResponder({ cenario: 'PROVAVEL', meses: [] });

    expect(elemento.textContent).toContain('Nao ha nada programado');
  });

  it('ofereceTentarDeNovo_quandoAConsultaFalha', () => {
    fixture = TestBed.createComponent(Previsao);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    responderPreferencia();

    http
      .expectOne((req) => req.url === rota)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Erro' });
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('servidor');
    clicarEm('Tentar de novo');
    http.expectOne((req) => req.url === rota).flush(previsao);
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Saldo projetado');
  });
});
