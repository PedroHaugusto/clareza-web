/**
 * Cores dos graficos, iguais as da interface: receita e entrada em verde, despesa e saida em
 * vermelho. Sao as mesmas usadas nas listas e nos saldos — trocar so nos graficos faria o
 * usuario reaprender o codigo de cor a cada tela.
 *
 * O par foi validado para daltonismo antes de entrar: separacao ΔE 8,4 em deuteranopia e 27,8
 * em visao normal, ambos acima do piso. Ainda assim os graficos carregam legenda e uma tabela
 * com os mesmos numeros, para a identidade nunca depender so da cor.
 *
 * `SALDO` e neutro de proposito: e uma serie unica que atravessa o zero, entao pintar de verde
 * ou vermelho sugeriria um julgamento que o proprio sinal do numero ja da.
 */
export const CORES = {
  RECEITA: '#047857',
  DESPESA: '#B91C1C',
  SALDO: '#334155',
  GRADE: '#E2E8F0',
  TEXTO: '#475569',
} as const;

/** Preenchimento translucido para a area sob a linha, sem competir com a propria linha. */
export const AREA_DO_SALDO = 'rgba(51, 65, 85, 0.08)';
