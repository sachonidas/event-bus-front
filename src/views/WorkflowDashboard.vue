<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import {
  useApi,
  type WorkflowDef,
  type WorkflowInstance,
  type WorkflowStepDef,
  type WorkflowStepLog,
} from '../composables/useApi'
import WorkflowSidebar from '../components/WorkflowSidebar.vue'
import WorkflowGraph from '../components/WorkflowGraph.vue'
import StepDetail from '../components/StepDetail.vue'

const api = useApi()

// State
const allInstances = ref<WorkflowInstance[]>([])
const workflows = ref<Map<string, WorkflowDef>>(new Map())
const selectedInstanceId = ref<string | null>(null)
const instanceDetail = ref<WorkflowInstance | null>(null)
const selectedStepName = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

// Computed
const currentWorkflowDef = computed<WorkflowDef | null>(() => {
  if (!instanceDetail.value) return null
  return workflows.value.get(instanceDetail.value.workflow_name) ?? null
})

const workflowSteps = computed<WorkflowStepDef[]>(() => {
  return currentWorkflowDef.value?.steps ?? []
})

const instanceStepLogs = computed<WorkflowStepLog[]>(() => {
  return instanceDetail.value?.steps ?? []
})

const currentStep = computed(() => {
  return instanceDetail.value?.current_step ?? null
})

const selectedStepDef = computed<WorkflowStepDef | null>(() => {
  if (!selectedStepName.value) return null
  return workflowSteps.value.find(s => s.name === selectedStepName.value) ?? null
})

const selectedStepLogs = computed<WorkflowStepLog[]>(() => {
  if (!selectedStepName.value) return []
  return instanceStepLogs.value.filter(s => s.step_name === selectedStepName.value)
})

// Stats
const stats = computed(() => {
  const running = allInstances.value.filter(i => i.status === 'running').length
  const completed = allInstances.value.filter(i => i.status === 'completed').length
  const failed = allInstances.value.filter(i => i.status === 'failed').length
  return { running, completed, failed }
})

// Actions
async function loadAllInstances() {
  // Cargar workflows para tener las definiciones de steps
  const wfList = await api.getWorkflows()
  for (const wf of wfList) {
    if (!workflows.value.has(wf.name)) {
      const detail = await api.getWorkflow(wf.name)
      workflows.value.set(wf.name, detail)
    }
  }

  // Cargar todas las instancias de todos los workflows
  const instances: WorkflowInstance[] = []
  for (const wf of wfList) {
    const wfInstances = await api.getWorkflowInstances(wf.name, undefined, 50)
    instances.push(...wfInstances)
  }

  // Ordenar por fecha más reciente
  instances.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  allInstances.value = instances
}

async function selectInstance(id: string) {
  selectedInstanceId.value = id
  selectedStepName.value = null
  instanceDetail.value = await api.getInstance(id)
}

function selectStep(stepName: string) {
  selectedStepName.value = stepName
}

function closeStepDetail() {
  selectedStepName.value = null
}

async function retryInstance(id: string) {
  await api.retryInstance(id)
  await loadAllInstances()
  if (selectedInstanceId.value === id) {
    instanceDetail.value = await api.getInstance(id)
  }
}

// Polling
async function refresh() {
  await loadAllInstances()
  if (selectedInstanceId.value && instanceDetail.value?.status === 'running') {
    instanceDetail.value = await api.getInstance(selectedInstanceId.value)
  }
}

onMounted(() => {
  loadAllInstances()
  pollInterval = setInterval(refresh, 3000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="dashboard-layout">
    <!-- Sidebar con instancias -->
    <WorkflowSidebar
      :instances="allInstances"
      :selected="selectedInstanceId"
      @select="selectInstance"
    />

    <!-- Main content -->
    <main class="main-content">
      <template v-if="instanceDetail && currentWorkflowDef">
        <!-- Header -->
        <div class="main-header">
          <div>
            <h1>
              {{ instanceDetail.workflow_name }}
              <span class="instance-id">/ {{ instanceDetail.id.slice(0, 8) }}</span>
            </h1>
            <p class="description" v-if="currentWorkflowDef.description">
              {{ currentWorkflowDef.description }}
            </p>
          </div>
          <div class="header-actions">
            <span
              class="status-pill"
              :class="instanceDetail.status"
            >
              {{ instanceDetail.status }}
            </span>
            <button
              v-if="instanceDetail.status !== 'running'"
              class="btn-retry"
              @click="retryInstance(instanceDetail.id)"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Info bar -->
        <div class="info-bar">
          <div class="info-item">
            <span class="info-label">Started</span>
            <span class="info-value">{{ new Date(instanceDetail.started_at).toLocaleString('es-ES') }}</span>
          </div>
          <div class="info-item" v-if="instanceDetail.completed_at">
            <span class="info-label">Completed</span>
            <span class="info-value">{{ new Date(instanceDetail.completed_at).toLocaleString('es-ES') }}</span>
          </div>
          <div class="info-item" v-if="instanceDetail.current_step">
            <span class="info-label">Current Step</span>
            <span class="info-value step-name">{{ instanceDetail.current_step }}</span>
          </div>
          <div class="info-item" v-if="instanceDetail.error_message">
            <span class="info-label">Error</span>
            <span class="info-value error">{{ instanceDetail.error_message }}</span>
          </div>
        </div>

        <!-- Graph -->
        <div class="graph-section">
          <WorkflowGraph
            :steps="workflowSteps"
            :step-logs="instanceStepLogs"
            :current-step="currentStep"
            @select-step="selectStep"
          />
        </div>

        <!-- Step log table -->
        <div class="steps-section" v-if="instanceStepLogs.length > 0">
          <h3>Step Log</h3>
          <div class="steps-table">
            <div class="table-header">
              <span>Step</span>
              <span>Type</span>
              <span>Status</span>
              <span>Result</span>
              <span>Attempt</span>
              <span>Duration</span>
              <span>Next</span>
            </div>
            <div
              v-for="log in instanceStepLogs"
              :key="log.id"
              class="table-row"
              :class="{ clickable: true, 'has-error': log.result === 'nok' }"
              @click="selectStep(log.step_name)"
            >
              <span class="cell-name">{{ log.step_name }}</span>
              <span class="cell-type">{{ log.step_type }}</span>
              <span class="cell-status" :class="log.status">{{ log.status }}</span>
              <span class="cell-result">
                {{ log.result === 'ok' ? '✅' : log.result === 'nok' ? '❌' : '—' }}
              </span>
              <span class="cell-attempt">{{ log.attempt }}/{{ log.max_retries + 1 }}</span>
              <span class="cell-duration">{{ log.duration_ms !== null ? log.duration_ms + 'ms' : '—' }}</span>
              <span class="cell-next">{{ log.next_step || '—' }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <h2>Workflow Dashboard</h2>
          <p>Select a process from the sidebar to view its flow and details.</p>
          <div class="global-stats" v-if="allInstances.length > 0">
            <span class="g-stat running">{{ stats.running }} running</span>
            <span class="g-stat completed">{{ stats.completed }} completed</span>
            <span class="g-stat failed">{{ stats.failed }} failed</span>
          </div>
        </div>
      </template>
    </main>

    <!-- Step detail overlay -->
    <StepDetail
      :step-def="selectedStepDef"
      :step-logs="selectedStepLogs"
      @close="closeStepDetail"
    />
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background: #0f1117;
  color: #e1e4e8;
  font-family: 'Inter', -apple-system, sans-serif;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.main-header h1 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0 0 4px 0;
}

.instance-id {
  color: #768390;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 400;
  font-size: 1rem;
}

.description {
  font-size: 0.8rem;
  color: #768390;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-pill {
  padding: 4px 14px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-pill.running { background: #0d2847; color: #58a6ff; }
.status-pill.completed { background: #1b3a2d; color: #56d364; }
.status-pill.failed { background: #3d1f20; color: #f47067; }
.status-pill.paused { background: #3d2e00; color: #d29922; }

.btn-retry {
  padding: 6px 14px;
  background: #da3633;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-retry:hover { opacity: 0.85; }

/* Info bar */
.info-bar {
  display: flex;
  gap: 20px;
  padding: 10px 14px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 0.65rem;
  color: #768390;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 0.8rem;
  color: #e1e4e8;
}

.info-value.step-name {
  color: #58a6ff;
  font-family: monospace;
}

.info-value.error {
  color: #f47067;
  font-family: monospace;
  font-size: 0.75rem;
}

/* Graph */
.graph-section {
  margin-bottom: 20px;
}

/* Step log table */
.steps-section {
  margin-top: 16px;
}

.steps-section h3 {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f0f3f6;
  margin: 0 0 10px 0;
}

.steps-table {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 0.7fr 0.8fr 1fr 1.5fr;
  gap: 8px;
  padding: 8px 12px;
  background: #1c2128;
  font-size: 0.65rem;
  color: #768390;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 0.7fr 0.8fr 1fr 1.5fr;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.75rem;
  border-top: 1px solid #21262d;
  transition: background 0.1s;
}

.table-row.clickable {
  cursor: pointer;
}

.table-row.clickable:hover {
  background: #1c2128;
}

.table-row.has-error {
  border-left: 3px solid #f47067;
}

.cell-name {
  color: #f0f3f6;
  font-family: monospace;
  font-weight: 500;
}

.cell-type {
  color: #768390;
}

.cell-status {
  font-weight: 500;
}

.cell-status.completed { color: #56d364; }
.cell-status.failed { color: #f47067; }
.cell-status.running { color: #58a6ff; }
.cell-status.retrying { color: #d29922; }

.cell-attempt, .cell-duration, .cell-next {
  color: #8b949e;
}

.cell-next {
  font-family: monospace;
  font-size: 0.7rem;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
}

.empty-state h2 {
  font-size: 1.3rem;
  color: #f0f3f6;
  margin-bottom: 8px;
}

.empty-state p {
  color: #768390;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.global-stats {
  display: flex;
  gap: 10px;
}

.g-stat {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.g-stat.running { background: #0d2847; color: #58a6ff; }
.g-stat.completed { background: #1b3a2d; color: #56d364; }
.g-stat.failed { background: #3d1f20; color: #f47067; }
</style>