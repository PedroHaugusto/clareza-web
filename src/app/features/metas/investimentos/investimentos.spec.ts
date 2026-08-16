import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { Investimentos } from './investimentos';

registerLocaleData(localePt, 'pt-BR');

describe('Investimentos', () => {
  let fixture: ComponentFixture<Investimentos>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/investimentos`;
  const rotaDoAporte = `${environment.urlDaApi}/api/meta-aporte`;

  const carteira = {
    totalInvestido: 51000,
    rentabilidadeMediaPonderada: 11.27,
    quantidade: 2,
    investimentos: [
      { id: 1, nome: 'CDB Banco X', tipo: 'RENDA_FIXA', valorInvestido: 50000, rentabilidadeInformada: 11 },
      { id: 2, nome: 'Bitcoin', tipo: 'CRIPTO', valorInvestido: 1000, rentabilidadeInformada: -8.5 },
    ],
  };

  const criarEResponder = (
    corpo: object = carteira,
    aporte: object = { valor: null, definida: false },
  ) => {
    fixture = TestBed.createComponent(Investimentos);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne(rota).flush(corpo);
    http.expectOne(rotaDoAporte).flush(aporte);
    fixture.detectChanges();
  };

  const clicarEm = (rotulo: string) => {
    const botao = [...elemento.querySelectorAll('button')].find(
      (candidato) =>
        candidato.textContent?.trim() === rotulo ||
        candidato.getAttribute('aria-label') === rotulo,
    );
    botao!.click();
    fixture.detectChanges();
  };

  const definir = (seletor: string, valor: string) => {
    const campo = elemento.querySelector(seletor) as HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Investimentos],
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

  it('mostraOConsolidadoQueAApiJaCalculou', () => {
    criarEResponder();

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('51.000,00');
    expect(texto).toContain('11,27%');
    expect(texto).toContain('ponderada pelo valor investido');
  });

  it('pintaDeVermelhoARentabilidadeNegativa', () => {
    criarEResponder();

    const percentuais = [...elemento.querySelectorAll('li span.text-xs.tabular-nums')];
    expect(percentuais[0].className).toContain('text-emerald-700');
    expect(percentuais[1].textContent).toContain('-8,5%');
    expect(percentuais[1].className).toContain('text-red-700');
  });

  it('naoImpedeRentabilidadeNegativa_noFormulario', () => {
    criarEResponder();

    clicarEm('Novo');
    definir('input[formControlName="nome"]', 'Fundo ruim');
    definir('input[formControlName="valorInvestido"]', '500');
    definir('input[formControlName="rentabilidadeInformada"]', '-12.5');
    clicarEm('Salvar');

    // Prejuizo e resultado legitimo, nao erro de digitacao.
    const criacao = http.expectOne((req) => req.method === 'POST' && req.url === rota);
    expect(criacao.request.body.rentabilidadeInformada).toBe(-12.5);
    criacao.flush({ id: 3 });
    fixture.detectChanges();

    http.expectOne(rota).flush(carteira);
    http.expectOne(rotaDoAporte).flush({ valor: null, definida: false });
    fixture.detectChanges();
  });

  it('omiteARentabilidade_quandoDeixadaEmBranco', () => {
    criarEResponder();

    clicarEm('Novo');
    definir('input[formControlName="nome"]', 'Poupanca');
    definir('input[formControlName="valorInvestido"]', '300');
    clicarEm('Salvar');

    const criacao = http.expectOne((req) => req.method === 'POST' && req.url === rota);
    expect(criacao.request.body).toEqual({
      nome: 'Poupanca',
      tipo: 'RENDA_FIXA',
      valorInvestido: 300,
    });
    criacao.flush({ id: 4 });
    fixture.detectChanges();

    http.expectOne(rota).flush(carteira);
    http.expectOne(rotaDoAporte).flush({ valor: null, definida: false });
    fixture.detectChanges();
  });

  it('ofereceOsCincoTipos', () => {
    criarEResponder();

    clicarEm('Novo');

    const opcoes = [...elemento.querySelectorAll('select[formControlName="tipo"] option')].map(
      (opcao) => opcao.textContent?.trim(),
    );
    expect(opcoes).toEqual(['Renda fixa', 'Acoes', 'FIIs', 'Cripto', 'Tesouro']);
  });

  describe('meta de aporte', () => {
    it('convidaADefinir_quandoNaoHaNada', () => {
      criarEResponder();

      expect(elemento.textContent).toContain('Nenhuma meta definida.');
    });

    it('defineAMeta', () => {
      criarEResponder();

      clicarEm('Definir');
      definir('input[formControlName="valor"]', '800');
      clicarEm('Salvar');

      const gravacao = http.expectOne(rotaDoAporte);
      expect(gravacao.request.method).toBe('PUT');
      expect(gravacao.request.body).toEqual({ valor: 800 });
      gravacao.flush({ valor: 800, definida: true });
      fixture.detectChanges();

      expect(elemento.textContent).toContain('800,00');
    });

    it('mostraOValorEPermiteRemover_quandoJaDefinida', () => {
      criarEResponder(carteira, { valor: 1200, definida: true });

      expect(elemento.textContent).toContain('1.200,00');

      clicarEm('Remover');
      const remocao = http.expectOne(rotaDoAporte);
      expect(remocao.request.method).toBe('DELETE');
      remocao.flush(null);
      fixture.detectChanges();

      expect(elemento.textContent).toContain('Nenhuma meta definida.');
    });
  });

  it('avisa_quandoNaoHaAplicacoes', () => {
    criarEResponder({ totalInvestido: 0, rentabilidadeMediaPonderada: 0, quantidade: 0, investimentos: [] });

    expect(elemento.textContent).toContain('Nenhuma aplicacao cadastrada');
  });
});
