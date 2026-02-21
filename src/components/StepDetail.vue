<script setup lang="ts">
import { computed } from 'vue'
import { type WorkflowStepDef, type WorkflowStepLog } from '../composables/useApi'

const props = defineProps<{
  stepDef: WorkflowStepDef | null
  stepLogs: WorkflowStepLog[]
}>()

const emit = defineEmits<{
  close: []
}>()

const lastLog = computed(() => {
  if (props.stepLogs.length === 0) return null
  return props.stepLogs[props.stepLogs.length - 1]
})

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return '#56d364'
    case 'failed': return '#f47067'
    case 'running': return '#58a6ff'
    case 'retrying': return '#d29922'
    case 'waiting': return '#8b949e'
    default: return '#768390'
  }
}

function formatJson(data: any): string {
  if (!data) return '—'
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}
</script>

<template>
  <div v-if="stepDef" class="detail-overlay">
    <div class="detail-panel">
      <div class="detail-header">
        <h3>{{ stepDef.name }}</h3>
        <button class="btn-close" @click="emit('close')">✕</button>
      </div>

      <div class="detail-body">
        <!-- Definition info -->
        <div class="section">
          <div class="section-title">Definition</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Type</span>
              <span class="info-value type-badge">{{ stepDef.type }}</span>
            </div>
            <div class="info-item" v-if="stepDef.description">
              <span class="info-label">Description</span>
              <span class="info-value">{{ stepDef.description }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">On OK</span>
              <span class="info-value ok">{{ stepDef.on_ok || 'END' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">On NOK</span>
              <span class="info-value nok">{{ stepDef.on_nok || 'END' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Retry</span>
              <span class="info-value">
                {{ stepDef.retry_policy.strategy }}
                <template v-if="stepDef.retry_policy.max_retries > 0">
                  ({{ stepDef.retry_policy.max_retries }}x, {{ stepDef.retry_policy.base_delay_ms }}ms)
                </template>
              </span>
            </div>
            <div class="info-item" v-if="stepDef.queue_name">
              <span class="info-label">Queue</span>
              <span class="info-value">{{ stepDef.queue_name }}</span>
            </div>
            <div class="info-item" v-if="stepDef.wait_for?.length">
              <span class="info-label">Waits for</span>
              <span class="info-value">{{ stepDef.wait_for.join(', ') }}</span>
            </div>
          </div>
        </div>

        <!-- Execution logs -->
        <div class="section" v-if="stepLogs.length > 0">
          <div class="section-title">Execution ({{ stepLogs.length }} attempt{{ stepLogs.length > 1 ? 's' : '' }})</div>

          <div
            v-for="log in stepLogs"
            :key="log.id"
            class="log-entry"
          >
            <div class="log-header">
              <span class="log-attempt">Attempt {{ log.attempt }}/{{ log.max_retries + 1 }}</span>
              <span
                class="log-status"
                :style="{ color: statusColor(log.status) }"
              >
                {{ log.status }}{{ log.result ? ` (${log.result})` : '' }}
              </span>
              <span class="log-duration" v-if="log.duration_ms !== null">
                {{ log.duration_ms }}ms
              </span>
            </div>

            <div class="log-times">
              <span>Start: {{ formatTime(log.started_at) }}</span>
              <span v-if="log.completed_at">End: {{ formatTime(log.completed_at) }}</span>
              <span v-if="log.next_step">Next: {{ log.next_step }}</span>
            </div>

            <div v-if="log.input_data" class="log-data">
              <div class="data-label">Input</div>
              <pre class="data-content">{{ formatJson(log.input_data) }}</pre>
            </div>

            <div v-if="log.output_data" class="log-data">
              <div class="data-label">Output</div>
              <pre class="data-content">{{ formatJson(log.output_data) }}</pre>
            </div>

            <div v-if="log.error_message" class="log-error">
              {{ log.error_message }}
            </div>
          </div>
        </div>

        <div class="section" v-else>
          <div class="section-title">Execution</div>
          <div class="empty">Not executed yet</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  background: #161b22;
  border-left: 1px solid #21262d;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
  z-index: 100;
  overflow-y: auto;
}

.detail-panel {
  padding: 16px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #21262d;
}

.detail-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
}

.btn-close {
  background: none;
  border: none;
  color: #768390;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-close:hover {
  color: #f0f3f6;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: #768390;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.info-label {
  font-size: 0.75rem;
  color: #768390;
}

.info-value {
  font-size: 0.8rem;
  color: #e1e4e8;
}

.info-value.ok { color: #56d364; }
.info-value.nok { color: #f47067; }

.type-badge {
  background: #2d333b;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: monospace;
}

.log-entry {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.log-attempt {
  font-size: 0.7rem;
  color: #768390;
  font-weight: 500;
}

.log-status {
  font-size: 0.75rem;
  font-weight: 600;
}

.log-duration {
  font-size: 0.7rem;
  color: #8b949e;
  margin-left: auto;
  font-family: monospace;
}

.log-times {
  display: flex;
  gap: 12px;
  font-size: 0.65rem;
  color: #484f58;
  margin-bottom: 6px;
}

.log-data {
  margin-top: 6px;
}

.data-label {
  font-size: 0.65rem;
  color: #768390;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.data-content {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 0.7rem;
  color: #e1e4e8;
  font-family: 'JetBrains Mono', monospace;
  overflow-x: auto;
  max-height: 150px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-error {
  margin-top: 6px;
  padding: 4px 8px;
  background: #3d1f20;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #f47067;
  font-family: monospace;
}

.empty {
  text-align: center;
  color: #484f58;
  padding: 12px;
  font-size: 0.8rem;
}
</style>