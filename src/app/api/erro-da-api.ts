import { HttpErrorResponse } from '@angular/common/http';

/**
 * Toda falha da API usa este mesmo corpo, o que permite um ponto unico de traducao.
 * `campos` so aparece em erro de validacao (400).
 */
export interface ErroDaApi {
  timestamp: string;
  status: number;
  erro: string;
  mensagem: string;
  path: string;
  campos?: CampoInvalido[];
}

export interface CampoInvalido {
  campo: string;
  mensagem: string;
}

/**
 * O plano gratuito do Render hiberna a API e o banco. A primeira requisicao depois de um
 * tempo parado pode levar ate um minuto — e enquanto isso o navegador pode nem completar a
 * conexao, o que chega aqui como status 0.
 */
export const MENSAGEM_DE_INDISPONIBILIDADE =
  'Nao foi possivel falar com o servidor. Ele pode estar iniciando — isso leva ate um minuto.';

const MENSAGEM_GENERICA = 'Algo deu errado. Tente novamente em instantes.';

/**
 * Normaliza qualquer falha do HttpClient para o formato da API.
 *
 * Nem toda falha traz o corpo da API: erro de rede, cold start, proxy no meio do caminho e
 * timeout chegam sem corpo ou com HTML. Quem consome o erro nao deveria precisar saber a
 * diferenca.
 */
export function normalizarErro(erro: HttpErrorResponse): ErroDaApi {
  const corpo: unknown = erro.error;

  if (ehCorpoDaApi(corpo)) {
    return corpo;
  }

  return {
    timestamp: new Date().toISOString(),
    status: erro.status,
    erro: erro.statusText || 'Error',
    mensagem: erro.status === 0 ? MENSAGEM_DE_INDISPONIBILIDADE : MENSAGEM_GENERICA,
    path: erro.url ?? '',
  };
}

function ehCorpoDaApi(corpo: unknown): corpo is ErroDaApi {
  if (corpo === null || typeof corpo !== 'object') {
    return false;
  }
  const candidato = corpo as Partial<ErroDaApi>;
  return typeof candidato.mensagem === 'string' && typeof candidato.status === 'number';
}

/** Mensagem do campo, quando a API apontou qual deles reprovou na validacao. */
export function mensagemDoCampo(erro: ErroDaApi | null, campo: string): string | null {
  const encontrado = erro?.campos?.find((invalido) => invalido.campo === campo);
  return encontrado ? encontrado.mensagem : null;
}
