/**
 * Deterministic network/failure scenarios. A scenario is selected with
 * `?scenario=<id>`, the dev panel, or `window.__kurio.setScenario(id)` and is
 * persisted in localStorage so it survives refresh.
 */
export const SCENARIO_STORAGE_KEY = 'kurio:mock:scenario'

export interface Scenario {
  id: string
  label: string
  description: string
}

export const SCENARIOS = [
  { id: 'default', label: 'Padrão', description: 'Sucesso com latência curta e fixa (20 ms).' },
  { id: 'empty-catalog', label: 'Catálogo vazio', description: 'GET /nfts retorna zero resultados.' },
  { id: 'slow', label: 'Rede lenta', description: 'Toda resposta demora 2,5 s.' },
  { id: 'jitter', label: 'Latência variável', description: 'Latência de 80 ms a 1,8 s em sequência reproduzível; respostas chegam fora de ordem.' },
  { id: 'offline', label: 'Sem conexão', description: 'Toda requisição falha com erro de rede.' },
  { id: 'http-500', label: 'Erro 500 no catálogo', description: 'GET /nfts responde 503 sempre.' },
  { id: 'flaky-catalog', label: 'Catálogo instável', description: 'As 3 primeiras chamadas a GET /nfts falham com 503; depois funciona.' },
  { id: 'favorites-fail', label: 'Falha em favoritos', description: 'PUT/DELETE de favoritos respondem 503 (rollback otimista).' },
  { id: 'session-expired', label: 'Sessão expirada', description: 'A primeira requisição autenticada responde 401 SESSION_EXPIRED e invalida o token.' },
  { id: 'price-change-during-checkout', label: 'Preço muda no checkout', description: 'No primeiro POST /orders o preço do primeiro item sobe 10% e a cotação fica obsoleta (409).' },
  { id: 'sold-out-during-checkout', label: 'Esgota no checkout', description: 'No primeiro POST /orders a edição do primeiro item esgota (409).' },
  { id: 'order-timeout', label: 'Timeout após criar pedido', description: 'O primeiro POST /orders cria o pedido mas a resposta nunca chega; reenviar com a mesma chave recupera o pedido.' },
  { id: 'payment-rejected', label: 'Pagamento recusado', description: 'Pedidos terminam como rejected.' },
  { id: 'wallet-refused', label: 'Carteira recusa conexão', description: 'POST /wallets/connect responde 403 WALLET_REFUSED.' },
  { id: 'order-hold', label: 'Pedido retido', description: 'Pedidos ficam pending até window.__kurio.resolveOrder().' },
] as const satisfies readonly Scenario[]

export type ScenarioId = (typeof SCENARIOS)[number]['id']

export const isScenarioId = (value: unknown): value is ScenarioId => SCENARIOS.some((scenario) => scenario.id === value)

interface RuntimeState {
  scenario: ScenarioId
  /** Counters reset on every scenario change or db reset, keeping runs reproducible. */
  requestSeq: number
  catalogCalls: number
  oneShotUsed: Set<string>
}

export const runtime: RuntimeState = { scenario: 'default', requestSeq: 0, catalogCalls: 0, oneShotUsed: new Set() }

export function loadScenario() {
  const stored = localStorage.getItem(SCENARIO_STORAGE_KEY)
  runtime.scenario = isScenarioId(stored) ? stored : 'default'
}

export function setScenario(id: ScenarioId) {
  runtime.scenario = id
  resetScenarioCounters()
  localStorage.setItem(SCENARIO_STORAGE_KEY, id)
}

export function resetScenarioCounters() {
  runtime.requestSeq = 0
  runtime.catalogCalls = 0
  runtime.oneShotUsed.clear()
}

/** Returns true only the first time `key` fires since the last reset. */
export function once(key: string) {
  if (runtime.oneShotUsed.has(key)) return false
  runtime.oneShotUsed.add(key)
  return true
}

/** Seeded latency sequence for the `jitter` scenario: same order on every run. */
export function jitterLatency(seq: number) {
  const x = Math.sin(seq * 12.9898 + 78.233) * 43758.5453
  const fraction = x - Math.floor(x)
  return Math.round(80 + fraction * 1720)
}

export function baseLatency(): number {
  switch (runtime.scenario) {
    case 'slow':
      return 2500
    case 'jitter':
      return jitterLatency(runtime.requestSeq)
    default:
      return 20
  }
}
