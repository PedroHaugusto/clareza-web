import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ArmazenamentoDeSessao } from '../sessao/armazenamento-de-sessao';
import { tokenInterceptor } from './token.interceptor';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    TestBed.inject(ArmazenamentoDeSessao).guardarToken('token-guardado');
  });

  afterEach(() => {
    controlador.verify();
    localStorage.clear();
  });

  it('injetaOBearer_quandoARotaEProtegida', () => {
    http.get(`${environment.urlDaApi}/api/transacoes`).subscribe();

    const requisicao = controlador.expectOne(`${environment.urlDaApi}/api/transacoes`);
    expect(requisicao.request.headers.get('Authorization')).toBe('Bearer token-guardado');
    requisicao.flush([]);
  });

  it('naoInjetaOBearer_quandoARotaEDeLogin', () => {
    // Um token velho viajando junto de um login novo e pedido de confusao no servidor.
    http.post(`${environment.urlDaApi}/api/auth/login`, {}).subscribe();

    const requisicao = controlador.expectOne(`${environment.urlDaApi}/api/auth/login`);
    expect(requisicao.request.headers.has('Authorization')).toBe(false);
    requisicao.flush({});
  });

  it('naoInjetaOBearer_quandoARotaEDeRegistro', () => {
    http.post(`${environment.urlDaApi}/api/auth/registrar`, {}).subscribe();

    const requisicao = controlador.expectOne(`${environment.urlDaApi}/api/auth/registrar`);
    expect(requisicao.request.headers.has('Authorization')).toBe(false);
    requisicao.flush({});
  });

  it('naoVazaOToken_quandoADestinoEOutroServidor', () => {
    http.get('https://terceiros.example.com/dados').subscribe();

    const requisicao = controlador.expectOne('https://terceiros.example.com/dados');
    expect(requisicao.request.headers.has('Authorization')).toBe(false);
    requisicao.flush({});
  });

  it('seguemSemCabecalho_quandoNaoHaTokenGuardado', () => {
    TestBed.inject(ArmazenamentoDeSessao).limpar();

    http.get(`${environment.urlDaApi}/api/transacoes`).subscribe();

    const requisicao = controlador.expectOne(`${environment.urlDaApi}/api/transacoes`);
    expect(requisicao.request.headers.has('Authorization')).toBe(false);
    requisicao.flush([]);
  });
});
