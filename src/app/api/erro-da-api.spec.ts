import { HttpErrorResponse } from '@angular/common/http';
import {
  ErroDaApi,
  MENSAGEM_DE_INDISPONIBILIDADE,
  mensagemDoCampo,
  normalizarErro,
} from './erro-da-api';

describe('normalizarErro', () => {
  it('devolveIntacto_quandoOCorpoJaEDaApi', () => {
    const corpo: ErroDaApi = {
      timestamp: '2026-08-16T05:16:56.791Z',
      status: 422,
      erro: 'Unprocessable Entity',
      mensagem: 'Esta conta tem lancamentos e nao pode ser excluida',
      path: '/api/contas/1',
    };

    const normalizado = normalizarErro(
      new HttpErrorResponse({ status: 422, error: corpo, url: '/api/contas/1' }),
    );

    expect(normalizado).toEqual(corpo);
  });

  it('preservaOsCamposInvalidos_quandoAValidacaoReprova', () => {
    const corpo: ErroDaApi = {
      timestamp: '2026-08-16T05:16:56.791Z',
      status: 400,
      erro: 'Bad Request',
      mensagem: 'Falha de validacao',
      path: '/api/transacoes',
      campos: [{ campo: 'valor', mensagem: 'deve ser maior que zero' }],
    };

    const normalizado = normalizarErro(new HttpErrorResponse({ status: 400, error: corpo }));

    expect(normalizado.campos).toEqual([{ campo: 'valor', mensagem: 'deve ser maior que zero' }]);
  });

  it('avisaSobreOServidorIniciando_quandoNaoHaResposta', () => {
    const normalizado = normalizarErro(
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
    );

    expect(normalizado.status).toBe(0);
    expect(normalizado.mensagem).toBe(MENSAGEM_DE_INDISPONIBILIDADE);
  });

  it('usaMensagemGenerica_quandoOCorpoNaoEDaApi', () => {
    const normalizado = normalizarErro(
      new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', error: '<html>proxy</html>' }),
    );

    expect(normalizado.status).toBe(502);
    expect(normalizado.mensagem).not.toContain('<html>');
    expect(normalizado.mensagem.length).toBeGreaterThan(0);
  });

  it('naoQuebra_quandoOCorpoVemNulo', () => {
    const normalizado = normalizarErro(new HttpErrorResponse({ status: 500, error: null }));

    expect(normalizado.status).toBe(500);
  });
});

describe('mensagemDoCampo', () => {
  const erro: ErroDaApi = {
    timestamp: '2026-08-16T05:16:56.791Z',
    status: 400,
    erro: 'Bad Request',
    mensagem: 'Falha de validacao',
    path: '/api/auth/registrar',
    campos: [{ campo: 'email', mensagem: 'deve ser um e-mail valido' }],
  };

  it('encontraAMensagemDoCampo', () => {
    expect(mensagemDoCampo(erro, 'email')).toBe('deve ser um e-mail valido');
  });

  it('devolveNulo_quandoOCampoNaoFoiApontado', () => {
    expect(mensagemDoCampo(erro, 'senha')).toBeNull();
  });

  it('devolveNulo_quandoNaoHaErro', () => {
    expect(mensagemDoCampo(null, 'email')).toBeNull();
  });
});
