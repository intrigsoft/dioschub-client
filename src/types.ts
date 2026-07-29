/**
 * @dioschub/client — Type definitions for the Diosc command-queue API
 *
 * Synced with modules/assistant-kit/src/engine/ (the source of truth).
 * These are the types an integrator needs to configure and interact
 * with the diosc() command API.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Core configuration for Diosc initialization */
export interface DioscConfig {
  /** Backend URL for WebSocket/REST connections */
  backendUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Assistant ID from DioscHub (auto-detected from config fetch if not provided) */
  assistantId?: string;
  /**
   * Host-side client endpoint that authenticates the user and forwards
   * identity + auth artifacts to dioschub's `POST /auth/bind`. When set,
   * the kit POSTs `{ wsId }` to this URL (with `credentials: 'include'`)
   * whenever `widget:auth:required` fires. See the DioscHub docs.
   */
  bindEndpoint?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Auto-connect WebSocket on initialization */
  autoConnect?: boolean;
  /** Number of reconnection attempts */
  reconnectAttempts?: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection delay in milliseconds */
  reconnectDelayMax?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
}

// ============================================================================
// AUTH-BINDING IDENTITY (delivered via `widget:bind:ready`)
// ============================================================================

export interface BoundRole {
  id: string;
  name: string;
}

/**
 * Identity bound to the WS connection by the host-side bind flow. Replaces
 * the old `AuthContext` / `AuthProvider` model — the kit no longer carries
 * auth as data. See the DioscHub docs.
 */
export interface BoundIdentity {
  userId: string;
  username: string;
  role: BoundRole;
}

// ============================================================================
// NAVIGATION
// ============================================================================

/** Navigation data for page transitions */
export interface NavigationData {
  path: string;
  search?: string;
  hash?: string;
}

/** Navigation observer callback signature */
export type NavigationObserverCallback = (
  notify: (data: NavigationData) => void,
) => void | (() => void);

// ============================================================================
// TOOLS
// ============================================================================

/**
 * Browser tool handler function.
 * Registered via `diosc('tool', name, handler)`.
 */
export type BrowserToolHandler = (
  params: any,
) => Promise<any> | any;

// ============================================================================
// APPROVALS
// ============================================================================

/** A single tool call inside an approval request. */
export interface ApprovalToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Schema-validation feedback when a previous approve/edit attempt produced
 * args that the tool's input schema rejected. Custom handlers should render
 * the errors so the user can fix them.
 */
export interface ApprovalValidationError {
  errors: Array<{ path: string; message: string }>;
  attempt: number;
}

/** An approval request payload delivered to a custom approval handler. */
export interface ApprovalRequest {
  /** Client-generated UI key */
  approvalId: string;
  /** Tool calls requiring approval */
  toolCalls: ApprovalToolCall[];
  /** When the request arrived from the server */
  requestedAt: Date;
  /** Approval policy info (if any) */
  approvalConfig?: any;
  /** Field-by-field proposed changes for diff display */
  proposedChanges?: any;
  /** Pre-fetched entity context (when configured server-side) */
  entityContext?: any;
  /** Re-prompt feedback when a prior approve/edit failed input-schema validation. */
  validationError?: ApprovalValidationError;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Protocol event names emitted by the engine.
 * These are the events you can subscribe to via `diosc('on', event, handler)`.
 *
 * Session events (from L2):
 */
export type SessionEventName =
  | 'session:started'
  | 'session:joined'
  | 'session:loaded'
  | 'session:list'
  | 'session:renamed'
  | 'session:pinned'
  | 'session:error'
  | 'session:user_changed'
  | 'session:state_changed'
  | 'auth:refreshed'
  | 'auth:failed';

/**
 * Server events (from L1 — passthrough from backend):
 */
export type ServerEventName =
  | 'authenticated'
  | 'disconnected'
  | 'reconnected'
  | 'rate_limited'
  | 'session:started'
  | 'session:joined'
  | 'session:restored'
  | 'session:restore_failed'
  | 'session:list'
  | 'session:loaded'
  | 'session:renamed'
  | 'session:pinned'
  | 'session:path_changed'
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:end'
  | 'session:error'
  | 'tool:started'
  | 'tool:completed'
  | 'tool:failed'
  | 'approval:request'
  | 'content_blocked'
  | 'files:updated'
  | 'browser:read_page';

/** All protocol event names (union of session + server events) */
export type ProtocolEventName = SessionEventName | ServerEventName;

/** Event handler function */
export type EventHandler<T = any> = (data: T) => void;

/** Wildcard event handler — receives event name + payload */
export type WildcardEventHandler = (event: string, payload: any) => void;

/** Unsubscribe function returned by event subscriptions */
export type Unsubscribe = () => void;

// ============================================================================
// COMMANDS
// ============================================================================

/** All available command names for the diosc() push-style API */
export type DioscCommand =
  | 'config'
  | 'bindHeaders'
  | 'tool'
  | 'mentionProvider'
  | 'observe'
  | 'invoke'
  | 'on'
  | 'onAny'
  | 'once'
  | 'onOpenChange'
  | 'onPositionChange'
  | 'connect'
  | 'disconnect'
  | 'reauth'
  | 'fetchAssistantConfig'
  | 'open'
  | 'close'
  | 'toggle'
  | 'setPosition'
  | 'cancelStream'
  | 'fetchSessionList'
  | 'fetchSessionListViaREST'
  | 'searchSessions'
  | 'clearSessionSearch'
  | 'loadSession'
  | 'startNewSession'
  | 'renameSession'
  | 'pinSession'
  | 'browserAdapter'
  | 'consensusView';

// ============================================================================
// CONSENSUS VIEWS (host-authored approval bodies)
// ============================================================================

/**
 * Field metadata handed to a consensus view, derived by the kit from the
 * gated tool's input schema.
 */
export interface ConsensusFieldMeta {
  key: string;
  title: string;
  type: string;
  widget: string;
  enum?: Array<{ value: unknown; label: string }>;
  placeholder?: string;
  unit?: string;
  emptyLabel?: string;
  format?: string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * One row of the kit-computed diff.
 *
 * Render from this. Do NOT re-derive the diff from `request`/`previous` — the
 * update semantics are subtle (a field absent from the proposal is UNCHANGED,
 * not cleared) and getting them wrong misdescribes what the user is approving.
 */
export interface ConsensusField {
  key: string;
  meta: ConsensusFieldMeta;
  /** Baseline value, from `previous`. Undefined for create. */
  from: unknown;
  /** Value that will be sent, including operator edits. */
  to: unknown;
  kind: 'same' | 'changed' | 'added' | 'removed' | 'create';
  readOnly: boolean;
}

/**
 * Everything a consensus view receives. One instance per request, and STABLE
 * for that request's lifetime — mutated in place, then `update(ctx)` is called.
 * Reactive hosts can hold it directly.
 *
 * Credential-blind: auth headers and tokens never reach an approval request,
 * so there is nothing sensitive here to filter.
 */
export interface ConsensusViewCtx {
  tool: string;
  op: 'create' | 'update' | 'delete';
  requestId: string;
  rowId: string;
  title: string;

  /** The model's proposed tool arguments. */
  request: Record<string, unknown>;
  /** Companion-fetched current state. Absent for create, or if unavailable. */
  previous?: Record<string, unknown>;
  /** Tool that produced `previous`. */
  companion?: string;

  /** The kit's diff — authoritative. */
  fields: ConsensusField[];

  /** True for delete: the body is a read-only confirmation. */
  readOnly: boolean;
  flagged?: boolean;
  flagReason?: string;
  /**
   * Schema-validation feedback from a previous failed edit attempt. Present when
   * edited args were rejected server-side — surface it, or the operator will
   * resubmit the same bad payload.
   */
  validationError?: ApprovalValidationError;

  /** Current overrides. Read-only view — mutate via setField. */
  edits: Record<string, unknown>;
  /** Record an edit. Feeds the kit's ledger and becomes `modifiedArgs`. */
  setField(key: string, value: unknown): void;
  /** Clear every override for this request. */
  resetEdits(): void;

  /** Aborted on unmount. */
  signal: AbortSignal;
}

/**
 * Host-supplied lifecycle for a consensus body.
 *
 * A closure, not a component reference — a component class is meaningless
 * without its framework runtime, while a closure runs in host scope and closes
 * over whatever it needs (an Angular injector, a store, the host router).
 *
 * There is deliberately NO way to approve or reject from here. Decisions come
 * only from the kit's own dialog chrome.
 */
export interface ConsensusViewDescriptor {
  /** Render into `el` — a light-DOM anchor, so host CSS applies. */
  mount(el: HTMLElement, ctx: ConsensusViewCtx): void | Promise<void>;
  /** Same ctx identity, mutated. Called on edits and decision changes. */
  update?(ctx: ConsensusViewCtx): void;
  /** Tear down. `ctx.signal` is already aborted. */
  unmount?(): void;
}

// ============================================================================
// BROWSER ADAPTER (host-declared intent surface)
// ============================================================================

/**
 * Minimal JSON Schema shape (matches Draft-07 essentials).
 */
export type JsonSchema = Record<string, unknown>;

/**
 * Host-declared adapter — passed via `diosc('browserAdapter', adapter)`
 * or the `<AssistantProvider browserAdapter={...} />` prop. Lets the host
 * page expose a snapshot reader plus a list of intents the AI may invoke.
 *
 * See the DioscHub docs.
 */
export interface BrowserAdapter {
  /** Snapshot of current page state. Pulled fresh on each LLM turn. */
  read(): Promise<PageSnapshot>;
  /** Intents the AI may invoke. Each becomes a first-class `browser_<name>` tool. */
  readonly intents: ReadonlyArray<IntentDefinition>;
}

export interface PageSnapshot {
  url: string;
  title: string;
  description?: string;
  content?: string;
  data?: Record<string, unknown>;
}

export interface IntentDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  schema: JsonSchema;
  handler: (args: TArgs) => Promise<IntentResult<TResult>>;
  approval?: IntentApproval<TArgs>;
}

export interface IntentApproval<TArgs = unknown> {
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: (args: TArgs) => string;
  diff?: (args: TArgs) => Array<{ field: string; current: string; next: string }>;
}

export interface IntentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// MENTIONS (host-declared mention provider for the composer @-popover)
// ============================================================================

/**
 * A single mentionable item shown in the composer's `@` popover. The `id` is
 * the canonical reference passed to the LLM via the wire format
 * `@[Name](kind:id)`. See the DioscHub docs.
 */
export interface MentionItem {
  /** Stable ID used by the LLM. Host-defined namespace. */
  id: string;
  /** Display name shown in the popover and as the chip label. */
  name: string;
  /** Host-defined category — prefixed onto the wire format (e.g. `node`). */
  kind: string;
  /** Optional secondary text in the popover. UI-only — not sent to the LLM. */
  description?: string;
  /** Optional grouping header in the popover. */
  group?: string;
}

/**
 * Host-declared resolver, registered via
 * `diosc('mentionProvider', queryFn | null)`. Called by the composer with the
 * current needle (text after `@`). Returns matching items synchronously —
 * typically a `filter()` over an in-memory list. If the host needs remote
 * data, it should pre-fetch into its own state and read from there; the API
 * stays sync.
 */
export type MentionQuery = (needle: string) => MentionItem[];
