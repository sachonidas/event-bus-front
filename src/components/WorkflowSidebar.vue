<script setup lang="ts">
import { type WorkflowInstance } from '../composables/useApi'

defineProps<{
  instances: WorkflowInstance[]
  selected: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
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

function statusDot(status: string): string {
  switch (status) {
    case 'running': return '🔄'
    case 'completed': return '✅'
    case 'failed': return '❌'
    case 'paused': return '⏸️'
    default: return '•'
  }
}

function shortId(id: string): string {
  return id.slice(0, 8)
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} ${hours}:${mins}`
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>Processes</h2>
      <span class="count">{{ instances.length }}</span>
    </div>

    <!-- Stats summary -->
    <div class="stats-bar">
      <span class="stat-mini running">
        {{ instances.filter(i => i.status === 'running').length }}
      </span>
      <span class="stat-mini completed">
        {{ instances.filter(i => i.status === 'completed').length }}
      </span>
      <span class="stat-mini failed">
        {{ instances.filter(i => i.status === 'failed').length }}
      </span>
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
          <span class="instance-status">{{ statusDot(inst.status) }}</span>
          <div class="instance-info">
            <div class="instance-name">
              <span class="workflow-name">{{ inst.workflow_name }}</span>
              <span class="separator">/</span>
              <span class="short-id">{{ shortId(inst.id) }}</span>
            </div>
            <div class="instance-meta">
              <span class="instance-time">{{ formatTime(inst.started_at) }}</span>
              <span
                v-if="inst.current_step"
                class="current-step"
              >
                @ {{ inst.current_step }}
              </span>
            </div>
          </div>
          <span
            class="status-badge"
            :style="{ color: statusColor(inst.status) }"
          >
            {{ inst.status }}
          </span>
        </div>

        <div v-if="inst.error_message" class="instance-error">
          {{ inst.error_message.length > 40
            ? inst.error_message.slice(0, 40) + '...'
            : inst.error_message
          }}
        </div>
      </div>

      <div v-if="instances.length === 0" class="empty">
        No processes found
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: #161b22;
  border-right: 1px solid #21262d;
  padding: 16px;
  width: 300px;
  min-height: 100vh;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-header h2 {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.count {
  background: #2d333b;
  color: #768390;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
}

.stats-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #21262d;
}

.stat-mini {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
}

.stat-mini.running { background: #0d2847; color: #58a6ff; }
.stat-mini.completed { background: #1b3a2d; color: #56d364; }
.stat-mini.failed { background: #3d1f20; color: #f47067; }

.instance-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.instance-item {
  padding: 8px 10px;
  border-radius: 6px;
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

.instance-status {
  font-size: 0.8rem;
  flex-shrink: 0;
}

.instance-info {
  flex: 1;
  min-width: 0;
}

.instance-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
}

.workflow-name {
  color: #768390;
  font-weight: 400;
}

.separator {
  color: #484f58;
}

.short-id {
  color: #f0f3f6;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.instance-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.instance-time {
  font-size: 0.65rem;
  color: #484f58;
}

.current-step {
  font-size: 0.65rem;
  color: #58a6ff;
  font-family: monospace;
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 500;
  flex-shrink: 0;
}

.instance-error {
  margin-top: 4px;
  margin-left: 24px;
  font-size: 0.65rem;
  color: #f47067;
  font-family: monospace;
}

.empty {
  text-align: center;
  color: #768390;
  padding: 24px 8px;
  font-size: 0.8rem;
}
</style>