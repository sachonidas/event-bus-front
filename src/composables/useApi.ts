import { ref, type Ref } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ── Types ───────────────────────────────────────

interface ProcessStatus {
  process_name: string
  status: string
  last_heartbeat: string
  errors: number
  events_count: number
  metadata: { memory_mb?: number; pid?: number } | null
  started_at: string | null
  stopped_at: string | null
}

interface OutboxEvent {
  event_id: string
  event_type: string
  source: string
  status: string
  attempts: number
  last_error: string | null
  created_at: string
  published_at: string | null
}

interface OutboxStats {
  pending: number
  published: number
  failed: number
}

interface QueueInfo {
  name: string
  messages: number
  messages_ready: number
  messages_unacked: number
  consumers: number
  state: string
}

interface EventLog {
  id: number
  event_id: string
  event_type: string
  direction: string
  process_name: string
  source: string | null
  payload_summary: string | null
  created_at: string
}

// ── Workflow Types ──

interface WorkflowStepDef {
  name: string
  type: string
  on_ok: string | null
  on_nok: string | null
  description: string | null
  retry_policy: {
    max_retries: number
    base_delay_ms: number
    strategy: string
  }
  queue_name?: string
  timeout_ms?: number
  wait_for?: string[]
}

interface WorkflowStats {
  running: number
  completed: number
  failed: number
  paused: number
}

interface WorkflowDef {
  name: string
  description: string | null
  is_active: boolean
  steps?: WorkflowStepDef[]
  stats: WorkflowStats
  created_at: string
  updated_at: string
}

interface WorkflowInstance {
  id: string
  workflow_name: string
  status: string
  current_step: string | null
  input_params?: Record<string, any>
  context_data?: Record<string, any>
  error_message: string | null
  started_at: string
  completed_at: string | null
  updated_at: string
  steps?: WorkflowStepLog[]
}

interface WorkflowStepLog {
  id: number
  step_name: string
  step_type: string
  status: string
  result: string | null
  attempt: number
  max_retries: number
  input_data: Record<string, any> | null
  output_data: Record<string, any> | null
  error_message: string | null
  next_step: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  queue_name: string | null
  waiting_for: string[] | null
}

interface GlobalWorkflowStats {
  global: WorkflowStats & { cancelled: number }
  last_24h: number
  avg_duration_ms: number | null
}

// ── API Fetch ───────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ── Composable ──────────────────────────────────

export function useApi() {
  const loading = ref(false)
  const error: Ref<string | null> = ref(null)

  async function withLoading<T>(fn: () => Promise<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  // ── Status ──
  async function getStatus(): Promise<ProcessStatus[]> {
    const data = await apiFetch<{ processes: ProcessStatus[] }>('/api/status')
    return data.processes
  }

  // ── Outbox ──
  async function getOutbox(status?: string, limit = 50): Promise<OutboxEvent[]> {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    params.set('limit', String(limit))
    const data = await apiFetch<{ events: OutboxEvent[] }>(`/api/outbox?${params}`)
    return data.events
  }

  async function getOutboxStats(): Promise<OutboxStats> {
    const data = await apiFetch<{ stats: OutboxStats }>('/api/outbox/stats')
    return data.stats
  }

  async function retryEvent(eventId: string): Promise<void> {
    await apiFetch(`/api/outbox/${eventId}/retry`, { method: 'POST' })
  }

  // ── Events ──
  async function getEvents(limit = 50, afterId?: number): Promise<EventLog[]> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (afterId !== undefined) params.set('after_id', String(afterId))
    const data = await apiFetch<{ events: EventLog[] }>(`/api/events?${params}`)
    return data.events
  }

  // ── Queues ──
  async function getQueues(): Promise<QueueInfo[]> {
    const data = await apiFetch<{ queues: QueueInfo[] }>('/api/queues')
    return data.queues
  }

  async function purgeQueue(name: string): Promise<void> {
    await apiFetch(`/api/queues/${name}/purge`, { method: 'POST' })
  }

  // ── Workers ──
  async function workerCommand(name: string, command: 'start' | 'stop' | 'restart'): Promise<void> {
    await apiFetch(`/api/workers/${name}/${command}`, { method: 'POST' })
  }

  // ── SSE Stream ──
  function connectEventStream(onEvent: (event: EventLog) => void): EventSource {
    const source = new EventSource(`${API_BASE}/api/events/live`)
    source.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data))
      } catch { /* heartbeat */ }
    }
    source.onerror = () => { error.value = 'Event stream disconnected' }
    return source
  }

  // ── Workflows ──
  async function getWorkflows(): Promise<WorkflowDef[]> {
    const data = await apiFetch<{ workflows: WorkflowDef[] }>('/api/workflows')
    return data.workflows
  }

  async function getWorkflow(name: string): Promise<WorkflowDef> {
    const data = await apiFetch<{ workflow: WorkflowDef }>(`/api/workflows/${name}`)
    return data.workflow
  }

  async function getWorkflowInstances(name: string, status?: string, limit = 50): Promise<WorkflowInstance[]> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (status) params.set('status', status)
    const data = await apiFetch<{ instances: WorkflowInstance[] }>(`/api/workflows/${name}/instances?${params}`)
    return data.instances
  }

  async function getInstance(id: string): Promise<WorkflowInstance> {
    const data = await apiFetch<{ instance: WorkflowInstance }>(`/api/instances/${id}`)
    return data.instance
  }

  async function getInstanceSteps(id: string): Promise<WorkflowStepLog[]> {
    const data = await apiFetch<{ steps: WorkflowStepLog[] }>(`/api/instances/${id}/steps`)
    return data.steps
  }

  async function retryInstance(id: string, fromStep?: string): Promise<void> {
    await apiFetch(`/api/instances/${id}/retry`, {
      method: 'POST',
      body: JSON.stringify({ from_step: fromStep }),
    })
  }

  async function getWorkflowStats(): Promise<GlobalWorkflowStats> {
    const data = await apiFetch<{ stats: GlobalWorkflowStats }>('/api/workflows/stats')
    return data.stats
  }

  return {
    loading,
    error,
    withLoading,
    // Status
    getStatus,
    // Outbox
    getOutbox,
    getOutboxStats,
    retryEvent,
    // Events
    getEvents,
    connectEventStream,
    // Queues
    getQueues,
    purgeQueue,
    // Workers
    workerCommand,
    // Workflows
    getWorkflows,
    getWorkflow,
    getWorkflowInstances,
    getInstance,
    getInstanceSteps,
    retryInstance,
    getWorkflowStats,
  }
}

export type {
  ProcessStatus, OutboxEvent, OutboxStats, QueueInfo, EventLog,
  WorkflowDef, WorkflowStepDef, WorkflowStats, WorkflowInstance,
  WorkflowStepLog, GlobalWorkflowStats,
}