<script setup lang="ts">
import { type WorkflowInstance } from '../composables/useApi'

defineProps<{
  instances: WorkflowInstance[]
  selected: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  retry: [id: string]
}>()

function statusColor(status: string): string {
  switch (status) {
    case 'running': return '#58a6ff'
    case 'completed': return '#56d364'
    case 'failed': return '#f47067'
    case 'paused': return '#d29922'
    default: return '#768390'
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'running': return '🔄'
    case 'completed': return '✅'
    case 'failed': return '❌'
    case 'paused': return '⏸️'
    default: return '•'
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-ES')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function duration(instance: WorkflowInstance): string {
  if (!instance.completed_at) return '—'
  const ms = new Date(instance.completed_at).getTime() - new Date(instance.started_at).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
</script>

<template>
  <div class="instance-panel">
    <div class="panel-header">
      <h3>Instances</h3>
      <span class="count">{{ instances.length }}</span>
    </div>

    <div class="instance-list">
      <div
        v-for="inst in instances"
        :key="inst.id"
        class="instance-item"
        :class="{ active: selected === inst.id }"
        @click="emit('select', inst.id)"
      >
        <div class="instance-row">
          <span class="instance-status" :style="{ color: statusColor(inst.status) }">
            {{ statusIcon(inst.status) }}
          </span>
          <span class="instance-id">{{ inst.id.slice(0, 8) }}...</span>
          <span class="instance-time">{{ formatDate(inst.started_at) }}</span>
        </div>

        <div class="instance-meta">
          <span v-if="inst.current_step" class="current-step">
            @ {{ inst.current_step }}
          </span>
          <span class="instance-duration">{{ duration(inst) }}</span>
          <button
            v-if="inst.status === 'failed'"
            class="btn-retry"
            @click.stop="emit('retry', inst.id)"
          >
            Retry
          </button>
        </div>

        <div v-if="inst.error_message" class="instance-error">
          {{ inst.error_message }}
        </div>
      </div>

      <div v-if="instances.length === 0" class="empty">
        No instances found
      </div>
    </div>
  </div>
</template>

<style scoped>
.instance-panel {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h3 {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0;
}

.count {
  background: #2d333b;
  color: #768390;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
}

.instance-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.instance-item {
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.instance-item:hover {
  background: #1c2128;
}

.instance-item.active {
  background: #1c2128;
  border-color: #388bfd;
}

.instance-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.instance-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: #f0f3f6;
}

.instance-time {
  font-size: 0.7rem;
  color: #484f58;
  margin-left: auto;
}

.instance-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding-left: 24px;
}

.current-step {
  font-size: 0.7rem;
  color: #58a6ff;
  font-family: monospace;
}

.instance-duration {
  font-size: 0.7rem;
  color: #768390;
}

.btn-retry {
  padding: 2px 8px;
  background: #2d333b;
  color: #f0c674;
  border: none;
  border-radius: 3px;
  font-size: 0.65rem;
  cursor: pointer;
  margin-left: auto;
}

.btn-retry:hover {
  background: #373e47;
}

.instance-error {
  margin-top: 4px;
  padding-left: 24px;
  font-size: 0.7rem;
  color: #f47067;
  font-family: monospace;
}

.empty {
  text-align: center;
  color: #768390;
  padding: 24px;
  font-size: 0.8rem;
}
</style>