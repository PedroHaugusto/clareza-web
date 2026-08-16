import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ArmazenamentoDeSessao } from './armazenamento-de-sessao';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let servico: AuthService;
  let http: HttpTestingController;
  let armazenamento: ArmazenamentoDeSessao;

  const respostaDeAutenticacao = {
    id: 1,
    nome: 'Ana',
    email: 'ana@clareza.dev',
    token: 'token-emitido',
    tipo: 'Bearer',
    expiraEm: '2026-08-16T06:18:03.561Z',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    armazenamento = TestBed.inject(ArmazenamentoDeSessao);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('comecaSemUsuarioAutenticado', () => {
    expect(servico.usuario()).toBeNull();
    expect(servico.autenticado()).toBe(false);
  });

  it('guardaOTokenDaPropriaResposta_quandoRegistra', () => {
    servico.registrar({ nome: 'Ana', email: 'ana@clareza.dev', senha: 'senha-secreta' }).subscribe();

    const requisicao = http.expectOne(`${environment.urlDaApi}/api/auth/registrar`);
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush(respostaDeAutenticacao);

    // O registro ja devolve o token: nao pode existir uma chamada a /login em seguida.
    http.expectNone(`${environment.urlDaApi}/api/auth/login`);
    expect(armazenamento.lerToken()).toBe('token-emitido');
    expect(servico.autenticado()).toBe(true);
  });

  it('populaOUsuario_quandoOLoginTemSucesso', () => {
    servico.entrar({ email: 'ana@clareza.dev', senha: 'senha-secreta' }).subscribe();

    http.expectOne(`${environment.urlDaApi}/api/auth/login`).flush(respostaDeAutenticacao);

    expect(servico.usuario()).toEqual({ id: 1, nome: 'Ana', email: 'ana@clareza.dev' });
    expect(armazenamento.lerToken()).toBe('token-emitido');
  });

  it('naoAutentica_quandoOLoginFalha', () => {
    let falhou = false;
    servico.entrar({ email: 'ana@clareza.dev', senha: 'errada' }).subscribe({
      error: () => (falhou = true),
    });

    http
      .expectOne(`${environment.urlDaApi}/api/auth/login`)
      .flush({ mensagem: 'E-mail ou senha invalidos', status: 401 }, { status: 401, statusText: 'Unauthorized' });

    expect(falhou).toBe(true);
    expect(servico.autenticado()).toBe(false);
    expect(armazenamento.lerToken()).toBeNull();
  });

  it('preencheODadoVerificado_quandoCarregaOUsuario', () => {
    servico.carregarUsuario().subscribe();

    http.expectOne(`${environment.urlDaApi}/api/auth/eu`).flush({
      id: 1,
      nome: 'Ana',
      email: 'ana@clareza.dev',
      possuiSenha: true,
      vinculadoAoGoogle: false,
    });

    expect(servico.usuario()?.possuiSenha).toBe(true);
  });

  it('limpaTokenEUsuario_quandoEncerraASessao', () => {
    servico.entrar({ email: 'ana@clareza.dev', senha: 'senha-secreta' }).subscribe();
    http.expectOne(`${environment.urlDaApi}/api/auth/login`).flush(respostaDeAutenticacao);

    servico.encerrarSessao();

    expect(servico.usuario()).toBeNull();
    expect(servico.autenticado()).toBe(false);
    expect(armazenamento.lerToken()).toBeNull();
  });

  describe('restaurarSessao', () => {
    it('naoChamaAApi_quandoNaoHaTokenGuardado', () => {
      let resultado: unknown = 'nao-emitiu';
      servico.restaurarSessao().subscribe((usuario) => (resultado = usuario));

      http.expectNone(`${environment.urlDaApi}/api/auth/eu`);
      expect(resultado).toBeNull();
    });

    it('recuperaOUsuario_quandoOTokenGuardadoAindaVale', () => {
      armazenamento.guardarToken('token-valido');

      servico.restaurarSessao().subscribe();

      http
        .expectOne(`${environment.urlDaApi}/api/auth/eu`)
        .flush({ id: 1, nome: 'Ana', email: 'ana@clareza.dev' });

      expect(servico.autenticado()).toBe(true);
    });

    it('descartaASessao_quandoOTokenGuardadoExpirou', () => {
      armazenamento.guardarToken('token-expirado');

      let erro: unknown = 'nao-emitiu';
      servico.restaurarSessao().subscribe({
        next: (usuario) => (erro = usuario),
        error: () => (erro = 'rejeitou'),
      });

      http
        .expectOne(`${environment.urlDaApi}/api/auth/eu`)
        .flush({ mensagem: 'Token expirado', status: 401 }, { status: 401, statusText: 'Unauthorized' });

      // Nunca rejeita: falha ao restaurar deixa o usuario como visitante, nao trava o boot.
      expect(erro).toBeNull();
      expect(servico.autenticado()).toBe(false);
      expect(armazenamento.lerToken()).toBeNull();
    });
  });
});
