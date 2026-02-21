<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { type WorkflowStepDef, type WorkflowStepLog } from '../composables/useApi'

const props = defineProps<{
  steps: WorkflowStepDef[]
  stepLogs?: WorkflowStepLog[]
  currentStep?: string | null
}>()

const emit = defineEmits<{
  selectStep: [stepName: string]
}>()

// ── Constants ──
const NODE_WIDTH = 220
const NODE_HEIGHT = 64
const V_GAP = 80
const H_OFFSET = 280 // NOK branch horizontal offset

// ── Drag state ──
const dragging = ref<string | null>(null)
const dragOffset = reactive({ x: 0, y: 0 })
const customPositions = reactive<Record<string, { x: number; y: number }>>({})
const svgRef = ref<SVGSVGElement | null>(null)

// ── Layout ──
interface NodePosition {
  x: number
  y: number
  step: WorkflowStepDef
}

const layout = computed(() => {
  const nodes: NodePosition[] = []
  const stepMap = new Map<string, WorkflowStepDef>()
  props.steps.forEach(s => stepMap.set(s.name, s))

  // Main OK path (top → bottom)
  const mainPath: string[] = []
  const visited = new Set<string>()

  if (props.steps.length > 0) {
    let current: string | null = props.steps[0].name
    while (current && !visited.has(current)) {
      visited.add(current)
      mainPath.push(current)
      const step = stepMap.get(current)
      current = step?.on_ok ?? null
    }
  }

  // Secondary nodes (NOK targets not in main path)
  const secondaryNodes: string[] = []
  props.steps.forEach(s => {
    if (!visited.has(s.name)) {
      secondaryNodes.push(s.name)
      visited.add(s.name)
    }
  })

  // Center X for main path
  const centerX = 60

  // Position main path vertically
  mainPath.forEach((name, i) => {
    const step = stepMap.get(name)!
    const defaultPos = {
      x: centerX,
      y: 40 + i * (NODE_HEIGHT + V_GAP),
    }

    nodes.push({
      x: customPositions[name]?.x ?? defaultPos.x,
      y: customPositions[name]?.y ?? defaultPos.y,
      step,
    })
  })

  // Position secondary nodes to the right
  secondaryNodes.forEach((name, i) => {
    const step = stepMap.get(name)!

    // Find which main node points to this via NOK
    const parent = props.steps.find(s => s.on_nok === name)
    const parentNode = nodes.find(n => n.step.name === parent?.name)
    const defaultY = parentNode ? parentNode.y + NODE_HEIGHT / 2 : 40 + i * (NODE_HEIGHT + V_GAP)

    const defaultPos = {
      x: centerX + H_OFFSET,
      y: defaultY,
    }

    nodes.push({
      x: customPositions[name]?.x ?? defaultPos.x,
      y: customPositions[name]?.y ?? defaultPos.y,
      step,
    })
  })

  return nodes
})

// ── SVG dimensions ──
const svgWidth = computed(() => {
  const maxX = Math.max(...layout.value.map(n => n.x + NODE_WIDTH), 500)
  return maxX + 60
})

const svgHeight = computed(() => {
  const maxY = Math.max(...layout.value.map(n => n.y + NODE_HEIGHT), 200)
  return maxY + 60
})

// ── Connections ──
interface Connection {
  from: NodePosition
  to: NodePosition
  type: 'ok' | 'nok'
}

const connections = computed<Connection[]>(() => {
  const conns: Connection[] = []
  const nodeMap = new Map<string, NodePosition>()
  layout.value.forEach(n => nodeMap.set(n.step.name, n))

  layout.value.forEach(node => {
    if (node.step.on_ok && nodeMap.has(node.step.on_ok)) {
      conns.push({ from: node, to: nodeMap.get(node.step.on_ok)!, type: 'ok' })
    }
    if (node.step.on_nok && nodeMap.has(node.step.on_nok)) {
      conns.push({ from: node, to: nodeMap.get(node.step.on_nok)!, type: 'nok' })
    }
  })

  return conns
})

// ── Connection paths ──
function connectionPath(conn: Connection): string {
  const fromCx = conn.from.x + NODE_WIDTH / 2
  const fromCy = conn.from.y + NODE_HEIGHT
  const toCx = conn.to.x + NODE_WIDTH / 2
  const toCy = conn.to.y

  if (conn.type === 'ok') {
    // Vertical OK: straight down with slight curve
    const midY = fromCy + (toCy - fromCy) / 2
    return `M ${fromCx} ${fromCy} C ${fromCx} ${midY}, ${toCx} ${midY}, ${toCx} ${toCy}`
  } else {
    // NOK: go right then down/up to target
    const exitX = conn.from.x + NODE_WIDTH
    const exitY = conn.from.y + NODE_HEIGHT / 2
    const enterX = conn.to.x
    const enterY = conn.to.y + NODE_HEIGHT / 2

    const cpOffset = 60
    return `M ${exitX} ${exitY} C ${exitX + cpOffset} ${exitY}, ${enterX - cpOffset} ${enterY}, ${enterX} ${enterY}`
  }
}

function connectionLabelPos(conn: Connection): { x: number; y: number } {
  if (conn.type === 'ok') {
    const fromCx = conn.from.x + NODE_WIDTH / 2
    const midY = conn.from.y + NODE_HEIGHT + (conn.to.y - conn.from.y - NODE_HEIGHT) / 2
    return { x: fromCx + 14, y: midY }
  } else {
    const exitX = conn.from.x + NODE_WIDTH
    const exitY = conn.from.y + NODE_HEIGHT / 2
    const enterX = conn.to.x
    const enterY = conn.to.y + NODE_HEIGHT / 2
    return { x: (exitX + enterX) / 2, y: (exitY + enterY) / 2 - 8 }
  }
}

// ── Step status from logs ──
function stepResult(stepName: string): string | null {
  if (!props.stepLogs) return null
  const logs = props.stepLogs.filter(l => l.step_name === stepName)
  if (logs.length === 0) return null
  return logs[logs.length - 1].result
}

function stepStatus(stepName: string): string {
  if (!props.stepLogs) return 'pending'
  const logs = props.stepLogs.filter(l => l.step_name === stepName)
  if (logs.length === 0) return 'pending'
  return logs[logs.length - 1].status
}

function nodeColor(stepName: string): string {
  if (stepName === props.currentStep) return '#1a3a5c'
  const result = stepResult(stepName)
  if (result === 'ok') return '#1a3d2a'
  if (result === 'nok') return '#3d1f20'
  const status = stepStatus(stepName)
  if (status === 'running') return '#1a3a5c'
  if (status === 'retrying') return '#3d3000'
  return '#1c2128'
}

function nodeBorder(stepName: string): string {
  if (stepName === props.currentStep) return '#58a6ff'
  const result = stepResult(stepName)
  if (result === 'ok') return '#2ea043'
  if (result === 'nok') return '#da3633'
  const status = stepStatus(stepName)
  if (status === 'running') return '#58a6ff'
  if (status === 'retrying') return '#d29922'
  return '#30363d'
}

function typeIcon(type: string): string {
  switch (type) {
    case 'queue_step': return '⚡'
    case 'wait_step': return '⏳'
    default: return '▶'
  }
}

function statusIcon(stepName: string): string {
  const result = stepResult(stepName)
  if (result === 'ok') return '✅'
  if (result === 'nok') return '❌'
  const status = stepStatus(stepName)
  if (status === 'running') return '🔄'
  if (status === 'retrying') return '🔁'
  return ''
}

function stepDuration(stepName: string): string {
  if (!props.stepLogs) return ''
  const logs = props.stepLogs.filter(l => l.step_name === stepName)
  if (logs.length === 0) return ''
  const last = logs[logs.length - 1]
  return last.duration_ms !== null ? `${last.duration_ms}ms` : ''
}

// ── Drag & Drop ──
function onMouseDown(e: MouseEvent, stepName: string) {
  if (e.button !== 0) return // Solo botón izquierdo
  e.preventDefault()
  e.stopPropagation()

  dragging.value = stepName

  const node = layout.value.find(n => n.step.name === stepName)
  if (!node || !svgRef.value) return

  const svgRect = svgRef.value.getBoundingClientRect()
  const svgX = (e.clientX - svgRect.left)
  const svgY = (e.clientY - svgRect.top)

  dragOffset.x = svgX - node.x
  dragOffset.y = svgY - node.y

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.value || !svgRef.value) return

  const svgRect = svgRef.value.getBoundingClientRect()
  const svgX = e.clientX - svgRect.left
  const svgY = e.clientY - svgRect.top

  customPositions[dragging.value] = {
    x: Math.max(0, svgX - dragOffset.x),
    y: Math.max(0, svgY - dragOffset.y),
  }
}

function onMouseUp() {
  dragging.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

function resetPositions() {
  Object.keys(customPositions).forEach(k => delete customPositions[k])
}

function onClickNode(stepName: string) {
  if (!dragging.value) {
    emit('selectStep', stepName)
  }
}
</script>

<template>
  <div class="graph-container">
    <div class="graph-toolbar">
      <button
        v-if="Object.keys(customPositions).length > 0"
        class="btn-reset"
        @click="resetPositions"
      >
        Reset layout
      </button>
      <span class="drag-hint">Drag nodes to reposition</span>
    </div>

    <svg
      ref="svgRef"
      :width="svgWidth"
      :height="svgHeight"
      class="workflow-svg"
    >
      <!-- Arrowhead markers -->
      <defs>
        <marker id="arrow-ok" viewBox="0 0 10 7" refX="10" refY="3.5"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#2ea043" />
        </marker>
        <marker id="arrow-nok" viewBox="0 0 10 7" refX="10" refY="3.5"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#da3633" />
        </marker>
      </defs>

      <!-- Connections -->
      <g v-for="(conn, i) in connections" :key="'conn-' + i">
        <path
          :d="connectionPath(conn)"
          fill="none"
          :stroke="conn.type === 'ok' ? '#2ea043' : '#da3633'"
          stroke-width="2"
          :stroke-dasharray="conn.type === 'nok' ? '6,4' : 'none'"
          :opacity="0.5"
          :marker-end="conn.type === 'ok' ? 'url(#arrow-ok)' : 'url(#arrow-nok)'"
        />
        <text
          :x="connectionLabelPos(conn).x"
          :y="connectionLabelPos(conn).y"
          font-size="10"
          :fill="conn.type === 'ok' ? '#56d364' : '#f47067'"
          text-anchor="middle"
          font-weight="600"
        >
          {{ conn.type === 'ok' ? 'OK' : 'NOK' }}
        </text>
      </g>

      <!-- Nodes -->
      <g
        v-for="node in layout"
        :key="node.step.name"
        :transform="`translate(${node.x}, ${node.y})`"
        class="node-group"
        :class="{ dragging: dragging === node.step.name }"
      >
        <!-- Background rect (drag handle) -->
        <rect
          :width="NODE_WIDTH"
          :height="NODE_HEIGHT"
          rx="8"
          ry="8"
          :fill="nodeColor(node.step.name)"
          :stroke="nodeBorder(node.step.name)"
          stroke-width="2"
          class="node-rect"
          @mousedown="onMouseDown($event, node.step.name)"
          @click="onClickNode(node.step.name)"
        />

        <!-- Type icon -->
        <text x="12" y="24" font-size="13" class="no-drag">
          {{ typeIcon(node.step.type) }}
        </text>

        <!-- Step name -->
        <text
          x="32" y="24"
          font-size="13"
          fill="#f0f3f6"
          font-weight="600"
          class="node-text"
        >
          {{ node.step.name.length > 20 ? node.step.name.slice(0, 20) + '...' : node.step.name }}
        </text>

        <!-- Description -->
        <text
          x="12" y="44"
          font-size="10"
          fill="#8b949e"
          class="node-text"
        >
          {{ (node.step.description || '').slice(0, 30) }}
        </text>

        <!-- Status icon -->
        <text
          :x="NODE_WIDTH - 24" y="24"
          font-size="13"
          class="no-drag"
        >
          {{ statusIcon(node.step.name) }}
        </text>

        <!-- Duration badge -->
        <g v-if="stepDuration(node.step.name)">
          <rect
            :x="NODE_WIDTH - 52" y="36"
            width="40" height="16"
            rx="4" fill="#0d1117" opacity="0.7"
          />
          <text
            :x="NODE_WIDTH - 32" y="48"
            font-size="9" fill="#8b949e"
            text-anchor="middle"
            font-family="monospace"
          >
            {{ stepDuration(node.step.name) }}
          </text>
        </g>

        <!-- Retry badge -->
        <g v-else-if="node.step.retry_policy.max_retries > 0">
          <rect
            :x="NODE_WIDTH - 38" y="36"
            width="28" height="16"
            rx="4" fill="#0d1117" opacity="0.7"
          />
          <text
            :x="NODE_WIDTH - 24" y="48"
            font-size="9" fill="#768390"
            text-anchor="middle"
          >
            {{ node.step.retry_policy.max_retries }}r
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.graph-container {
  overflow: auto;
  background: #0d1117;
  border-radius: 8px;
  border: 1px solid #21262d;
}

.graph-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #161b22;
}

.btn-reset {
  padding: 3px 10px;
  background: #21262d;
  color: #768390;
  border: 1px solid #30363d;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
}

.btn-reset:hover {
  background: #2d333b;
  color: #e1e4e8;
}

.drag-hint {
  font-size: 0.65rem;
  color: #484f58;
  font-style: italic;
}

.workflow-svg {
  display: block;
  padding: 16px;
  min-width: 100%;
}

.node-group {
  cursor: grab;
  user-select: none;
}

.node-group.dragging {
  cursor: grabbing;
}

.node-group.dragging .node-rect {
  filter: brightness(1.3);
  stroke-width: 3;
}

.node-rect {
  transition: filter 0.1s;
}

.node-group:hover .node-rect {
  filter: brightness(1.15);
}

.node-text, .no-drag {
  pointer-events: none;
}
</style>