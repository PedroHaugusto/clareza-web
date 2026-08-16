/**
 * As tres rotas da API que dispensam token. Listadas uma a uma, como no backend: com um
 * padrao do tipo `/api/auth/**` qualquer rota nova sob esse prefixo passaria a ser tratada
 * como publica sem ninguem perceber.
 */
const ROTAS_PUBLICAS = ['/api/auth/registrar', '/api/auth/login', '/api/auth/google'];

export function ehRotaPublica(url: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => url.includes(rota));
}

/** O login e o unico 401 que nao significa "sua sessao acabou", e sim "credencial errada". */
export function ehTentativaDeAutenticacao(url: string): boolean {
  return ehRotaPublica(url);
}
