<script setup lang="ts">
import { type ProcessStatus } from '../composables/useApi'

defineProps<{
  processes: ProcessStatus[]
}>()

const emit = defineEmits<{
  command: [name: string, command: 'start' | 'stop' | 'restart']
}>()

function statusColor(status: string): string {
  switch (status) {
    case 'running': return '#56d364'
    case 'stopped': return '#768390'
    case 'error': return '#f47067'
    case 'unresponsive': return '#f0c674'
    case 'stopping': return '#f0c674'
    default: return '#768390'
  }
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleTimeString()
}

function timeSince(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <h2>Processes</h2>
      <span class="process-count">{{ processes.length }}</span>
    </div>

    <div class="process-list">
      <div
        v-for="proc in processes"
        :key="proc.process_name"
        class="process-card"
      >
        <div class="process-info">
          <div class="process-name-row">
            <span
              class="status-dot"
              :style="{ background: statusColor(proc.status) }"
            />
            <span class="process-name">{{ proc.process_name }}</span>
            <span class="process-status" :style="{ color: statusColor(proc.status) }">
              {{ proc.status }}
            </span>
          </div>

          <div class="process-meta">
            <span>Events: {{ proc.events_count }}</span>
            <span>Errors: {{ proc.errors }}</span>
            <span>Beat: {{ timeSince(proc.last_heartbeat) }}</span>
            <span v-if="proc.metadata?.memory_mb">
              Mem: {{ proc.metadata.memory_mb }}MB
            </span>
          </div>
        </div>

        <div class="process-actions">
          <button
            v-if="proc.status !== 'running'"
            class="btn btn-start"
            @click="emit('command', proc.process_name, 'start')"
          >
            Start
          </button>
          <button
            v-if="proc.status === 'running'"
            class="btn btn-stop"
            @click="emit('command', proc.process_name, 'stop')"
          >
            Stop
          </button>
          <button
            class="btn btn-restart"
            @click="emit('command', proc.process_name, 'restart')"
          >
            Restart
          </button>
        </div>
      </div>

      <div v-if="processes.length === 0" class="empty">
        No processes registered
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0;
}

.process-count {
  background: #2d333b;
  color: #768390;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
}

.process-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.process-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #0d1117;
  border-radius: 6px;
  border: 1px solid #21262d;
}

.process-info {
  flex: 1;
}

.process-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.process-name {
  font-weight: 500;
  color: #f0f3f6;
  font-size: 0.9rem;
}

.process-status {
  font-size: 0.75rem;
  font-weight: 500;
}

.process-meta {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: #768390;
  margin-left: 16px;
}

.process-actions {
  display: flex;
  gap: 6px;
}

.btn {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
}

.btn:hover { opacity: 0.85; }

.btn-start { background: #238636; color: #fff; }
.btn-stop { background: #da3633; color: #fff; }
.btn-restart { background: #2d333b; color: #e1e4e8; }

.empty {
  text-align: center;
  color: #768390;
  padding: 24px;
  font-size: 0.85rem;
}
</style>