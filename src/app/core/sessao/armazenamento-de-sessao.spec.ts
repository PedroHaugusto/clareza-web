import { TestBed } from '@angular/core/testing';
import { ArmazenamentoDeSessao } from './armazenamento-de-sessao';

describe('ArmazenamentoDeSessao', () => {
  let armazenamento: ArmazenamentoDeSessao;

  beforeEach(() => {
    localStorage.clear();
    armazenamento = TestBed.inject(ArmazenamentoDeSessao);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('guardaELeOToken', () => {
    armazenamento.guardarToken('token-de-teste');

    expect(armazenamento.lerToken()).toBe('token-de-teste');
  });

  it('devolveNulo_quandoNaoHaTokenGuardado', () => {
    expect(armazenamento.lerToken()).toBeNull();
  });

  it('limpaOToken', () => {
    armazenamento.guardarToken('token-de-teste');

    armazenamento.limpar();

    expect(armazenamento.lerToken()).toBeNull();
  });

  it('naoQuebra_quandoOArmazenamentoEstaIndisponivel', () => {
    const indisponivel = () => {
      throw new DOMException('acesso negado');
    };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(indisponivel);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(indisponivel);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(indisponivel);

    expect(() => armazenamento.guardarToken('token-de-teste')).not.toThrow();
    expect(armazenamento.lerToken()).toBeNull();
    expect(() => armazenamento.limpar()).not.toThrow();
  });
});
