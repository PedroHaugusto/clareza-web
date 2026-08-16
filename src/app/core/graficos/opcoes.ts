import { ChartOptions } from 'chart.js';
import { CORES } from './cores';

/**
 * Opcoes comuns aos graficos do app.
 *
 * Grade e eixos ficam recessivos: quem carrega a informacao sao as marcas, nao as reguas. Os
 * valores no eixo vem abreviados (`12,5 mil`) porque escrever o valor cheio em cada marca
 * rouba mais espaco do que esclarece — o numero exato vive na tabela abaixo de cada grafico.
 */
export function opcoesBase(formatarValor: (valor: number) => string): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: false,
        labels: { color: CORES.TEXTO, usePointStyle: true, boxWidth: 8 },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (contexto) =>
            `${contexto.dataset.label}: ${formatarValor(contexto.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: CORES.GRADE },
        ticks: { color: CORES.TEXTO },
      },
      y: {
        grid: { color: CORES.GRADE },
        border: { display: false },
        ticks: {
          color: CORES.TEXTO,
          callback: (valor) => abreviar(Number(valor)),
        },
      },
    },
  };
}

/** `12500` vira `12,5 mil`; abaixo de mil o numero inteiro ja e curto o bastante. */
export function abreviar(valor: number): string {
  const absoluto = Math.abs(valor);

  if (absoluto >= 1_000_000) {
    return `${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (absoluto >= 1000) {
    return `${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Rotulo do eixo: `set` dentro do mesmo ano, `jan/27` quando a serie vira o ano. */
export function rotuloDoMes(mes: number, ano: number, anoDeReferencia: number): string {
  const nome = MESES_CURTOS[mes - 1] ?? '';
  return ano === anoDeReferencia ? nome : `${nome}/${String(ano).slice(2)}`;
}
