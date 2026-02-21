# Event Dashboard

A real-time monitoring dashboard for event-driven workflow systems. Built with Vue 3, TypeScript, and Vite.

## Features

- **Workflow Monitoring**: Visualize and track workflow instances in real-time
- **Step-by-Step Execution**: View detailed step logs with status, duration, and retry information
- **Interactive Workflow Graph**: Visual representation of workflow execution flow
- **Real-time Updates**: Auto-polling every 3 seconds to keep data fresh
- **Instance Management**: Retry failed workflows with a single click
- **Event Streaming**: Live event stream using Server-Sent Events (SSE)
- **Process Status Tracking**: Monitor worker processes and their health
- **Outbox Pattern Support**: Track outbound events with retry capabilities
- **Queue Monitoring**: View RabbitMQ queue statistics and manage queues

## Tech Stack

- **Vue 3** - Progressive JavaScript framework with Composition API
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Vue Router** - Client-side routing

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- Backend API server running (default: `http://localhost:8080`)

## Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server with hot-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Build

Compile and type-check for production:

```bash
npm run build
```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

### Type-Check

Run TypeScript type checking:

```bash
npm run type-check
```

## Configuration

### API URL

The dashboard connects to a backend API. Configure the API URL using the `VITE_API_URL` environment variable:

```bash
# .env.local
VITE_API_URL=http://localhost:8080
```

If not set, it defaults to `http://localhost:8080`.

## Project Structure

```
src/
├── components/          # Vue components
│   ├── EventStream.vue      # Live event stream viewer
│   ├── InstanceList.vue     # Workflow instance list
│   ├── OutboxPanel.vue      # Outbox event management
│   ├── ProcessPanel.vue     # Process status monitoring
│   ├── QueuesPanel.vue      # Queue statistics
│   ├── StepDetail.vue       # Step execution details
│   ├── WorkflowGraph.vue    # Visual workflow graph
│   └── WorkflowSidebar.vue  # Instance navigation sidebar
├── composables/         # Composable functions
│   └── useApi.ts           # API client with TypeScript types
├── views/              # Page components
│   └── WorkflowDashboard.vue  # Main dashboard view
├── router/             # Vue Router configuration
│   └── index.ts
└── App.vue             # Root component
```

## API Integration

The dashboard expects a REST API with the following endpoints:

### Workflows
- `GET /api/workflows` - List all workflows
- `GET /api/workflows/:name` - Get workflow definition
- `GET /api/workflows/:name/instances` - Get workflow instances
- `GET /api/instances/:id` - Get instance details
- `POST /api/instances/:id/retry` - Retry a failed instance

### Events
- `GET /api/events` - Get event log
- `GET /api/events/live` - SSE endpoint for live events

### Outbox
- `GET /api/outbox` - Get outbox events
- `GET /api/outbox/stats` - Get outbox statistics
- `POST /api/outbox/:id/retry` - Retry failed event

### Queues
- `GET /api/queues` - Get queue information
- `POST /api/queues/:name/purge` - Purge a queue

### Status
- `GET /api/status` - Get process status information

See [useApi.ts](src/composables/useApi.ts) for complete TypeScript type definitions.

## Features in Detail

### Workflow Dashboard

The main dashboard ([WorkflowDashboard.vue](src/views/WorkflowDashboard.vue)) provides:

- **Sidebar**: Lists all workflow instances with status indicators (running, completed, failed, paused)
- **Instance Details**: Shows workflow name, ID, timestamps, current step, and error messages
- **Visual Graph**: Interactive graph showing workflow step connections and execution status
- **Step Log Table**: Detailed table of all step executions with:
  - Step name and type
  - Status (completed, running, failed, retrying)
  - Result indicators
  - Retry attempts
  - Execution duration
  - Next step routing

### Step Detail View

Click on any step to view:
- Step definition (type, retry policy, timeout)
- All execution attempts for that step
- Input and output data
- Error messages
- Execution metadata

### Real-time Updates

- Instances refresh every 3 seconds
- Running instances are automatically updated
- Live event stream for real-time notifications

## Development

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) - Vue 3 language support
- [TypeScript Vue Plugin](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

### Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

### Type Support for `.vue` Imports

TypeScript cannot handle type information for `.vue` imports by default. We use `vue-tsc` for type checking instead of `tsc`. In editors, [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) makes the TypeScript language service aware of `.vue` types.

## License

Private project.

## Contributing

This is a private project. For questions or issues, contact the project maintainers.
