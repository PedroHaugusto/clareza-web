import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { Categorias } from './categorias';

describe('Categorias', () => {
  let fixture: ComponentFixture<Categorias>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  const rota = `${environment.urlDaApi}/api/categorias`;

  const categorias = [
    { id: 1, nome: 'Salario', tipo: 'RECEITA', corHex: '#2E7D32', padraoDoSistema: true },
    { id: 7, nome: 'Outros', tipo: 'AMBOS', corHex: '#546E7A', padraoDoSistema: true },
    { id: 9, nome: 'Pets', tipo: 'DESPESA', corHex: '#AD1457', padraoDoSistema: false },
  ];

  const criarEResponder = (corpo: object = categorias) => {
    fixture = TestBed.createComponent(Categorias);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne(rota).flush(corpo);
    fixture.detectChanges();
  };

  const clicarEm = (rotulo: string) => {
    const botao = [...elemento.querySelectorAll('button')].find(
      (candidato) => candidato.textContent?.trim() === rotulo,
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
      imports: [Categorias],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listaAsCategoriasComTipoECor', () => {
    criarEResponder();

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Pets');
    expect(texto).toContain('Receita e despesa');
    const bolinha = elemento.querySelector('li span.rounded-full') as HTMLElement;
    expect(bolinha.style.backgroundColor).not.toBe('');
  });

  it('naoOfereceExcluirNasCategoriasDoSistema', () => {
    criarEResponder();

    const itens = [...elemento.querySelectorAll('li')];
    // Padrao do sistema responde 422 na API: o botao nem deve existir.
    expect(itens[0].querySelector('button')).toBeNull();
    expect(itens[0].textContent).toContain('Padrao do sistema');
    expect(itens[2].querySelector('button')).not.toBeNull();
  });

  it('naoEnvia_quandoONomeEstaVazio', () => {
    criarEResponder();

    clicarEm('Nova');
    clicarEm('Salvar');

    http.expectNone((req) => req.method === 'POST');
    expect(elemento.textContent).toContain('Informe um nome.');
  });

  it('criaERecarregaALista', () => {
    criarEResponder();

    clicarEm('Nova');
    definir('input[formControlName="nome"]', 'Viagens');
    definir('select[formControlName="tipo"]', 'DESPESA');
    clicarEm('Salvar');

    const criacao = http.expectOne((req) => req.method === 'POST' && req.url === rota);
    expect(criacao.request.body).toEqual({
      nome: 'Viagens',
      tipo: 'DESPESA',
      corHex: '#546E7A',
    });
    criacao.flush({ id: 10, nome: 'Viagens' });
    fixture.detectChanges();

    http.expectOne((req) => req.method === 'GET' && req.url === rota).flush(categorias);
    fixture.detectChanges();

    expect(elemento.querySelector('form')).toBeNull();
  });

  it('mostraAMensagemDaApi_quandoONomeJaExiste', () => {
    criarEResponder();

    clicarEm('Nova');
    definir('input[formControlName="nome"]', 'salario');
    clicarEm('Salvar');

    http.expectOne((req) => req.method === 'POST').flush(
      {
        timestamp: '2026-08-16T05:16:56.791Z',
        status: 422,
        erro: 'Unprocessable Entity',
        mensagem: 'Ja existe uma categoria com este nome',
        path: '/api/categorias',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Ja existe uma categoria com este nome',
    );
    // O formulario continua aberto com o que foi digitado, para o usuario corrigir.
    expect(elemento.querySelector('form')).not.toBeNull();
  });

  it('pedeConfirmacaoAntesDeExcluir', () => {
    criarEResponder();

    (
      elemento.querySelector('button[aria-label="Excluir categoria Pets"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    http.expectNone(`${rota}/9`);
    expect(elemento.textContent).toContain('Excluir categoria');
  });

  it('excluiERecarrega_quandoOUsuarioConfirma', () => {
    criarEResponder();

    (
      elemento.querySelector('button[aria-label="Excluir categoria Pets"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const dialogo = elemento.querySelector('.fixed') as HTMLElement;
    [...dialogo.querySelectorAll('button')]
      .find((botao) => botao.textContent?.trim() === 'Excluir')!
      .click();
    fixture.detectChanges();

    const exclusao = http.expectOne(`${rota}/9`);
    expect(exclusao.request.method).toBe('DELETE');
    exclusao.flush(null);
    fixture.detectChanges();

    http.expectOne((req) => req.method === 'GET' && req.url === rota).flush(categorias);
    fixture.detectChanges();
  });

  it('ofereceTentarDeNovo_quandoACargaFalha', () => {
    fixture = TestBed.createComponent(Categorias);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http.expectOne(rota).error(new ProgressEvent('error'), { status: 0, statusText: 'Erro' });
    fixture.detectChanges();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('servidor');
    clicarEm('Tentar de novo');
    http.expectOne(rota).flush(categorias);
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Pets');
  });
});
