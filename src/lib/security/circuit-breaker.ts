interface CircuitState {
  failures: number
  state: "CLOSED" | "OPEN" | "HALF_OPEN"
  openedAt: number
}

const circuits = new Map<string, CircuitState>()

const FAILURE_THRESHOLD = 5
const OPEN_TIMEOUT_MS = 60_000

function circuitKey(hostname: string): string {
  return hostname
}

export function getCircuitState(hostname: string): "CLOSED" | "OPEN" | "HALF_OPEN" {
  const key = circuitKey(hostname)
  const circuit = circuits.get(key)

  if (!circuit || circuit.state === "CLOSED") return "CLOSED"

  if (circuit.state === "OPEN") {
    if (Date.now() - circuit.openedAt >= OPEN_TIMEOUT_MS) {
      circuits.set(key, { failures: 0, state: "HALF_OPEN", openedAt: 0 })
      return "HALF_OPEN"
    }
    return "OPEN"
  }

  return "HALF_OPEN"
}

export function recordFailure(hostname: string): void {
  const key = circuitKey(hostname)
  const circuit = circuits.get(key)

  if (!circuit) {
    circuits.set(key, { failures: 1, state: "CLOSED", openedAt: 0 })
    return
  }

  circuit.failures++
  if (circuit.failures >= FAILURE_THRESHOLD) {
    circuit.state = "OPEN"
    circuit.openedAt = Date.now()
  }
}

export function recordSuccess(hostname: string): void {
  const key = circuitKey(hostname)
  const circuit = circuits.get(key)

  if (!circuit) return

  if (circuit.state === "HALF_OPEN") {
    circuit.state = "CLOSED"
    circuit.failures = 0
    circuit.openedAt = 0
    return
  }

  if (circuit.state === "OPEN") return

  circuit.failures = Math.max(0, circuit.failures - 1)
}

export function resetCircuits(): void {
  circuits.clear()
}
