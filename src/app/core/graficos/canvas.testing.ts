/**
 * O jsdom nao implementa `canvas.getContext()`, entao cada grafico montado num teste imprime
 * um aviso — dezenas deles enterram a saida real da suite. Instalar o pacote `canvas` so para
 * isso traria uma dependencia nativa pesada para pintar pixels que ninguem inspeciona.
 *
 * Este contexto falso responde a tudo que o Chart.js chama, com o minimo que ele espera de
 * volta. Os testes de grafico verificam dados, controles e tabela — nunca o desenho.
 */
export function prepararCanvasParaTeste(): void {
  const contexto = {
    canvas: { width: 400, height: 200, style: {} },
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    createPattern: () => null,
    getImageData: () => ({ data: [] }),
    save: naoFazNada,
    restore: naoFazNada,
    beginPath: naoFazNada,
    closePath: naoFazNada,
    moveTo: naoFazNada,
    lineTo: naoFazNada,
    bezierCurveTo: naoFazNada,
    quadraticCurveTo: naoFazNada,
    arc: naoFazNada,
    arcTo: naoFazNada,
    rect: naoFazNada,
    roundRect: naoFazNada,
    fill: naoFazNada,
    stroke: naoFazNada,
    clip: naoFazNada,
    fillRect: naoFazNada,
    clearRect: naoFazNada,
    strokeRect: naoFazNada,
    fillText: naoFazNada,
    strokeText: naoFazNada,
    translate: naoFazNada,
    rotate: naoFazNada,
    scale: naoFazNada,
    setTransform: naoFazNada,
    setLineDash: naoFazNada,
    getLineDash: () => [],
    isPointInPath: () => false,
  };

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    contexto as unknown as CanvasRenderingContext2D,
  );
}

function naoFazNada(): void {
  // Sem efeito: o teste nunca olha o resultado do desenho.
}
