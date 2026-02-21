<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi, type OutboxStats, type OutboxEvent } from '../composables/useApi'

defineProps<{
  stats: OutboxStats
}>()

const emit = defineEmits<{
  retry: [eventId: string]
}>()

const api = useApi()
const failedEvents = ref<OutboxEvent[]>([])
const showFailed = ref(false)

async function loadFailed() {
  showFailed.value = !showFailed.value
  if (showFailed.value) {
    failedEvents.value = await api.getOutbox('failed', 20)
  }
}

function truncate(str: string | null, len: number): string {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '...' : str
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-ES')
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <h2>Outbox</h2>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value pending">{{ stats.pending }}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-value published">{{ stats.published }}</div>
        <div class="stat-label">Published</div>
      </div>
      <div class="stat-card" @click="loadFailed" style="cursor: pointer">
        <div class="stat-value failed">{{ stats.failed }}</div>
        <div class="stat-label">Failed {{ showFailed ? '▲' : '▼' }}</div>
      </div>
    </div>

    <div v-if="showFailed && failedEvents.length > 0" class="failed-list">
      <div
        v-for="event in failedEvents"
        :key="event.event_id"
        class="failed-item"
      >
        <div class="failed-info">
          <span class="failed-type">{{ event.event_type }}</span>
          <span class="failed-time">{{ formatTime(event.created_at) }}</span>
          <span class="failed-attempts">{{ event.attempts }} attempts</span>
          <div class="failed-error">{{ truncate(event.last_error, 80) }}</div>
        </div>
        <button
          class="btn btn-retry"
          @click="emit('retry', event.event_id)"
        >
          Retry
        </button>
      </div>
    </div>

    <div v-if="showFailed && failedEvents.length === 0" class="empty">
      No failed events
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
  margin-bottom: 16px;
}

.panel-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.stat-value.pending { color: #f0c674; }
.stat-value.published { color: #56d364; }
.stat-value.failed { color: #f47067; }

.stat-label {
  font-size: 0.7rem;
  color: #768390;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.failed-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 250px;
  overflow-y: auto;
}

.failed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #1c1f26;
  border-radius: 4px;
  border-left: 3px solid #f47067;
}

.failed-info {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.failed-type {
  color: #f0f3f6;
  font-size: 0.8rem;
  font-weight: 500;
}

.failed-time {
  color: #484f58;
  font-size: 0.7rem;
}

.failed-attempts {
  color: #f0c674;
  font-size: 0.7rem;
}

.failed-error {
  width: 100%;
  color: #f47067;
  font-size: 0.7rem;
  font-family: monospace;
}

.btn-retry {
  padding: 4px 10px;
  background: #2d333b;
  color: #f0c674;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  flex-shrink: 0;
}

.btn-retry:hover {
  background: #373e47;
}

.empty {
  text-align: center;
  color: #768390;
  padding: 16px;
  font-size: 0.8rem;
}
</style>