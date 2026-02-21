<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { type EventLog } from '../composables/useApi'

const props = defineProps<{
  events: EventLog[]
}>()

const listRef = ref<HTMLElement | null>(null)
const autoScroll = ref(true)

function directionIcon(direction: string): string {
  return direction === 'published' ? '📤' : '📨'
}

function directionColor(direction: string): string {
  return direction === 'published' ? '#56d364' : '#79c0ff'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

watch(
  () => props.events.length,
  async () => {
    if (autoScroll.value && listRef.value) {
      await nextTick()
      listRef.value.scrollTop = 0
    }
  }
)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <h2>Event Stream</h2>
      <div class="stream-controls">
        <span class="live-dot" />
        <span class="live-text">Live</span>
        <label class="autoscroll">
          <input type="checkbox" v-model="autoScroll" />
          Auto-scroll
        </label>
      </div>
    </div>

    <div class="event-list" ref="listRef">
      <div
        v-for="event in events"
        :key="event.id"
        class="event-item"
      >
        <span class="event-time">{{ formatTime(event.created_at) }}</span>
        <span class="event-direction">{{ directionIcon(event.direction) }}</span>
        <span
          class="event-type"
          :style="{ color: directionColor(event.direction) }"
        >
          {{ event.event_type }}
        </span>
        <span class="event-process">{{ event.process_name }}</span>
        <span class="event-source" v-if="event.source">← {{ event.source }}</span>
      </div>

      <div v-if="events.length === 0" class="empty">
        Waiting for events...
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
  margin-bottom: 12px;
}

.panel-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0;
}

.stream-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #56d364;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.live-text {
  font-size: 0.75rem;
  color: #56d364;
  font-weight: 500;
}

.autoscroll {
  font-size: 0.7rem;
  color: #768390;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  margin-left: 8px;
}

.autoscroll input {
  cursor: pointer;
}

.event-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-list::-webkit-scrollbar {
  width: 6px;
}

.event-list::-webkit-scrollbar-track {
  background: #0d1117;
}

.event-list::-webkit-scrollbar-thumb {
  background: #2d333b;
  border-radius: 3px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.event-item:hover {
  background: #1c2128;
}

.event-time {
  color: #484f58;
  flex-shrink: 0;
}

.event-direction {
  flex-shrink: 0;
}

.event-type {
  font-weight: 500;
}

.event-process {
  color: #768390;
  font-size: 0.7rem;
}

.event-source {
  color: #484f58;
  font-size: 0.7rem;
}

.empty {
  text-align: center;
  color: #768390;
  padding: 40px;
  font-size: 0.85rem;
}
</style>