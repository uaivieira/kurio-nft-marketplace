export const SCENARIO_STORAGE_KEY = 'kurio:mock:scenario'

export const SCENARIOS = [
  { id: 'default' },
  { id: 'empty-catalog' },
  { id: 'slow' },
  { id: 'jitter' },
  { id: 'offline' },
  { id: 'http-500' },
  { id: 'flaky-catalog' },
  { id: 'favorites-fail' },
  { id: 'session-expired' },
  { id: 'price-change-during-checkout' },
  { id: 'sold-out-during-checkout' },
  { id: 'order-timeout' },
  { id: 'payment-rejected' },
  { id: 'wallet-refused' },
  { id: 'order-hold' },
] as const

export type ScenarioId = (typeof SCENARIOS)[number]['id']

export const isScenarioId = (value: unknown): value is ScenarioId => SCENARIOS.some((scenario) => scenario.id === value)

interface RuntimeState {
  scenario: ScenarioId
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

export function once(key: string) {
  if (runtime.oneShotUsed.has(key)) return false
  runtime.oneShotUsed.add(key)
  return true
}

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
