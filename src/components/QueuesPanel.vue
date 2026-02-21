<script setup lang="ts">
import { type QueueInfo } from '../composables/useApi'

defineProps<{
  queues: QueueInfo[]
}>()

const emit = defineEmits<{
  purge: [name: string]
}>()

function stateColor(state: string): string {
  switch (state) {
    case 'running': return '#56d364'
    case 'idle': return '#768390'
    default: return '#f0c674'
  }
}

function confirmPurge(name: string) {
  if (confirm(`Purge all messages from queue "${name}"?`)) {
    emit('purge', name)
  }
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <h2>Queues</h2>
      <span class="queue-count">{{ queues.length }}</span>
    </div>

    <div class="queue-list">
      <div
        v-for="queue in queues"
        :key="queue.name"
        class="queue-card"
      >
        <div class="queue-info">
          <div class="queue-name-row">
            <span class="queue-name">{{ queue.name }}</span>
            <span
              class="queue-state"
              :style="{ color: stateColor(queue.state) }"
            >
              {{ queue.state }}
            </span>
          </div>
          <div class="queue-meta">
            <span class="meta-item">
              <span class="meta-value">{{ queue.messages }}</span>
              messages
            </span>
            <span class="meta-item">
              <span class="meta-value">{{ queue.messages_ready }}</span>
              ready
            </span>
            <span class="meta-item">
              <span class="meta-value">{{ queue.messages_unacked }}</span>
              unacked
            </span>
            <span class="meta-item">
              <span class="meta-value">{{ queue.consumers }}</span>
              consumers
            </span>
          </div>
        </div>

        <button
          class="btn btn-purge"
          @click="confirmPurge(queue.name)"
          :disabled="queue.messages === 0"
        >
          Purge
        </button>
      </div>

      <div v-if="queues.length === 0" class="empty">
        No queues found
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

.queue-count {
  background: #2d333b;
  color: #768390;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #0d1117;
  border-radius: 6px;
  border: 1px solid #21262d;
}

.queue-info {
  flex: 1;
}

.queue-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.queue-name {
  font-weight: 500;
  color: #f0f3f6;
  font-size: 0.85rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.queue-state {
  font-size: 0.7rem;
  font-weight: 500;
}

.queue-meta {
  display: flex;
  gap: 14px;
  font-size: 0.7rem;
  color: #768390;
}

.meta-value {
  color: #e1e4e8;
  font-weight: 600;
}

.btn-purge {
  padding: 4px 10px;
  background: #2d333b;
  color: #f47067;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 500;
}

.btn-purge:hover:not(:disabled) {
  background: #3d1f20;
}


.btn-purge:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.empty {
  text-align: center;
  color: #768390;
  padding: 24px;
  font-size: 0.85rem;
}
</style>