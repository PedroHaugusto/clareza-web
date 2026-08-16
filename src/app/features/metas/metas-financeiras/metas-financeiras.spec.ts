import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { MetasFinanceiras } from './metas-financeiras';

registerLocaleData(localePt, 'pt-BR');

describe('MetasFinanceiras', () => {
  let fixture: ComponentFixture<MetasFinanceiras>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/metas`;

  const metas = [
    {
      id: 1,
      nome: 'Viagem',
      valorAtual: 2500,
      valorObjetivo: 10000,
      percentualConcluido: 25,
      valorRestante: 7500,
      concluida: false,
      prazo: '2026-12-31',
      diasAtePrazo: 137,
      prazoVencido: false,
      descricao: 'Japao',
    },
    {
      id: 2,
      nome: 'Reserva',
      valorAtual: 12000,
      valorObjetivo: 10000,
      percentualConcluido: 120,
      valorRestante: 0,
      concluida: true,
    },
  ];

  const criarEResponder = (corpo: object = metas) => {
    fixture = TestBed.createComponent(MetasFinanceiras);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne(rota).flush(corpo);
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
    const campo = elemento.querySelector(seletor) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetasFinanceiras],
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

  it('naoDeixaABarraEstourar_quandoAMetaEsuperada', () => {
    criarEResponder();

    const barras = [...elemento.querySelectorAll('[role="progressbar"] > div')] as HTMLElement[];
    expect(barras[0].style.width).toBe('25%');
    // 120% na leitura, mas a barra para no trilho.
    expect(barras[1].style.width).toBe('100%');
    expect(elemento.textContent).toContain('120%');
  });

  it('marcaAMetaConcluida', () => {
    criarEResponder();

    const itens = [...elemento.querySelectorAll('li')];
    expect(itens[1].textContent).toContain('Concluida');
    expect(itens[1].textContent).toContain('Objetivo alcancado');
  });

  it('dizSemPrazo_quandoAApiOmiteOsCamposDeData', () => {
    criarEResponder();

    const itens = [...elemento.querySelectorAll('li')];
    expect(itens[0].textContent).toContain('137 dia(s)');
    expect(itens[1].textContent).toContain('Sem prazo');
  });

  it('destacaOPrazoVencido', () => {
    criarEResponder([
      { ...metas[0], prazoVencido: true, diasAtePrazo: -3, concluida: false },
    ]);

    const prazo = [...elemento.querySelectorAll('li span')].find((span) =>
      span.textContent?.includes('prazo vencido'),
    );
    expect(prazo?.className).toContain('text-red-700');
  });

  it('naoEnvia_quandoOObjetivoEstaVazio', () => {
    criarEResponder();

    clicarEm('Nova meta');
    definir('input[formControlName="nome"]', 'Carro');
    clicarEm('Salvar');

    http.expectNone((req) => req.method === 'POST');
    expect(elemento.textContent).toContain('Informe um valor maior que zero.');
  });

  it('omiteOsOpcionaisVazios_aoCriar', () => {
    criarEResponder();

    clicarEm('Nova meta');
    definir('input[formControlName="nome"]', 'Carro');
    definir('input[formControlName="valorObjetivo"]', '50000');
    clicarEm('Salvar');

    const criacao = http.expectOne((req) => req.method === 'POST' && req.url === rota);
    // Prazo e descricao em branco ficam fora do corpo, em vez de virar string vazia.
    expect(criacao.request.body).toEqual({ nome: 'Carro', valorObjetivo: 50000, valorAtual: 0 });
    criacao.flush({ id: 3 });
    fixture.detectChanges();

    http.expectOne((req) => req.method === 'GET' && req.url === rota).flush(metas);
    fixture.detectChanges();
  });

  it('atualizaOProgressoPeloValorJaGuardado', () => {
    criarEResponder();

    clicarEm('Editar meta Viagem');
    expect((elemento.querySelector('input[formControlName="valorAtual"]') as HTMLInputElement).value).toBe(
      '2500',
    );

    definir('input[formControlName="valorAtual"]', '4000');
    clicarEm('Salvar');

    const edicao = http.expectOne((req) => req.method === 'PUT' && req.url === `${rota}/1`);
    expect(edicao.request.body.valorAtual).toBe(4000);
    edicao.flush({ id: 1 });
    fixture.detectChanges();

    http.expectOne((req) => req.method === 'GET' && req.url === rota).flush(metas);
    fixture.detectChanges();
  });

  it('pedeConfirmacaoAntesDeExcluir', () => {
    criarEResponder();

    clicarEm('Excluir meta Viagem');

    http.expectNone(`${rota}/1`);
    expect(elemento.textContent).toContain('Excluir meta');
  });

  it('convidaACriarAPrimeira_quandoNaoHaMetas', () => {
    criarEResponder([]);

    expect(elemento.textContent).toContain('Defina onde voce quer chegar');
  });
});
