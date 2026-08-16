import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ArmazenamentoDeSessao } from '../../core/sessao/armazenamento-de-sessao';
import { AuthService } from '../../core/sessao/auth.service';
import { AreaLogada } from './area-logada';

describe('AreaLogada', () => {
  let fixture: ComponentFixture<AreaLogada>;
  let elemento: HTMLElement;
  let http: HttpTestingController;
  let navegouPara: string[];

  beforeEach(async () => {
    localStorage.clear();
    navegouPara = [];

    await TestBed.configureTestingModule({
      imports: [AreaLogada],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation((url) => {
      navegouPara.push(String(url));
      return Promise.resolve(true);
    });

    const auth = TestBed.inject(AuthService);
    auth.entrar({ email: 'ana@clareza.dev', senha: 'senha-secreta' }).subscribe();
    http
      .expectOne(`${environment.urlDaApi}/api/auth/login`)
      .flush({ id: 1, nome: 'Ana', email: 'ana@clareza.dev', token: 'token-emitido' });

    fixture = TestBed.createComponent(AreaLogada);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('mostraONomeDeQuemEstaLogado', () => {
    expect(elemento.textContent).toContain('Ana');
  });

  it('ofereceNavegacaoParaAsAreasDoApp', () => {
    const destinos = [...elemento.querySelectorAll('nav a')].map((link) =>
      link.getAttribute('href'),
    );

    expect(destinos).toEqual(['/visao-geral', '/lancamentos']);
  });

  it('limpaASessaoEVoltaParaOLogin_quandoOUsuarioSai', () => {
    (elemento.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    expect(TestBed.inject(ArmazenamentoDeSessao).lerToken()).toBeNull();
    expect(navegouPara).toEqual(['/login']);
  });
});
