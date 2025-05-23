/**
 * Type definitions for Consul API
 */

/**
 * Custom fetch function type that matches the native fetch API
 */
export type FetchFn = typeof fetch;

/**
 * Fetch request options with extended properties
 */
export interface FetchRequestOptions extends RequestInit {
  params?: Record<string, any>;
  responseType?: "json" | "text" | "arraybuffer" | "blob";
}

/**
 * Base options that can be passed to Consul API methods
 */
export interface ConsulBaseOptions {
  /** Specifies the datacenter to query. Defaults to the datacenter of the agent. */
  dc?: string;
  /** Specifies a namespace to query */
  ns?: string;
  /** Enterprise - Specifies the admin partition to use */
  partition?: string;
  /** Will return the output in pretty-printed JSON format */
  pretty?: boolean;
}

/**
 * Options for blocking queries
 */
export interface BlockingQueryOptions extends ConsulBaseOptions {
  /** Used with a GET request to wait for a change */
  index?: number;
  /** Specifies the maximum duration for the blocking request */
  wait?: string;
  /** Can be 'default', 'consistent', or 'stale' */
  consistency?: "default" | "consistent" | "stale";
}

/**
 * Node definitions
 */
export interface Node {
  /** Node ID */
  ID?: string;
  /** Node name */
  Node: string;
  /** Node address */
  Address: string;
  /** Datacenter the node is in */
  Datacenter?: string;
  /** Tagged addresses for the node */
  TaggedAddresses?: Record<string, string>;
  /** Node metadata for filtering */
  NodeMeta?: Record<string, string>;
  /** CreateIndex value */
  CreateIndex?: number;
  /** ModifyIndex value */
  ModifyIndex?: number;
}

/**
 * Tagged address with port
 */
export interface TaggedAddress {
  /** The address */
  address: string;
  /** The port */
  port: number;
}

/**
 * Service definition for registration
 */
export interface Service {
  /** Service ID. Defaults to Service if not provided */
  ID?: string;
  /** Service name */
  Service: string;
  /** Tags for the service */
  Tags?: string[];
  /** Service-specific address. Defaults to node address if not provided */
  Address?: string;
  /** Service metadata */
  Meta?: Record<string, string>;
  /** Service port */
  Port?: number;
  /** Tagged addresses for the service */
  TaggedAddresses?: Record<string, TaggedAddress>;
  /** Enterprise - Namespace for this service */
  Namespace?: string;
  /** Service Kind */
  Kind?: string;
  /** Service proxy configuration, if this service is a Connect proxy */
  Proxy?: ServiceProxy;
  /** Connect configuration for this service */
  Connect?: ServiceConnect;
  /** CreateIndex value */
  CreateIndex?: number;
  /** ModifyIndex value */
  ModifyIndex?: number;
}

/**
 * Proxy configuration for a service
 */
export interface ServiceProxy {
  /** Service ID of the service being proxied */
  DestinationServiceID?: string;
  /** Service name of the service being proxied */
  DestinationServiceName?: string;
  /** Address of the local service */
  LocalServiceAddress?: string;
  /** Port of the local service */
  LocalServicePort?: number;
  /** Proxy operating mode */
  Mode?: string;
  /** Upstream services this proxy routes to */
  Upstreams?: ServiceUpstream[];
  /** Configuration for transparent proxy mode */
  TransparentProxy?: TransparentProxyConfig;
  /** Configuration for mesh gateway */
  MeshGateway?: MeshGatewayConfig;
}

/**
 * Configuration for an upstream service
 */
export interface ServiceUpstream {
  /** Datacenter where the service is located */
  Datacenter?: string;
  /** Name of destination service */
  DestinationName?: string;
  /** Namespace of destination service */
  DestinationNamespace?: string;
  /** Type of destination (service, prepared_query) */
  DestinationType?: string;
  /** Local address to bind to for this upstream */
  LocalBindAddress?: string;
  /** Local port to bind to for this upstream */
  LocalBindPort?: number;
  /** Mesh gateway configuration for this upstream */
  MeshGateway?: MeshGatewayConfig;
}

/**
 * Configuration for transparent proxy mode
 */
export interface TransparentProxyConfig {
  /** Port to listen for outbound connections */
  OutboundListenerPort?: number;
  /** Whether to disable the outbound listener */
  DisableOutboundPassthrough?: boolean;
}

/**
 * Mesh gateway configuration
 */
export interface MeshGatewayConfig {
  /** Gateway mode (local, remote, none) */
  Mode?: string;
}

/**
 * Connect configuration for a service
 */
export interface ServiceConnect {
  /** Whether this service supports Connect natively */
  Native?: boolean;
  /** Connect proxy configuration */
  Proxy?: ServiceProxy;
  /** SidecarService configuration */
  SidecarService?: Service;
}

/**
 * Health check definition
 */
export interface Check {
  /** Node name */
  Node?: string;
  /** Check ID. Default to Name if not provided */
  CheckID?: string;
  /** Name of the check */
  Name: string;
  /** Additional human-readable notes */
  Notes?: string;
  /** Status of the check: passing, warning, critical */
  Status: "passing" | "warning" | "critical";
  /** ID of the service this check is for */
  ServiceID?: string;
  /** Name of the service this check is for */
  ServiceName?: string;
  /** Check definition */
  Definition?: CheckDefinition;
  /** Enterprise - Namespace for this check */
  Namespace?: string;
  /** Output from the last check */
  Output?: string;
  /** Tags for the service this check is monitoring */
  ServiceTags?: string[];
  /** CreateIndex value */
  CreateIndex?: number;
  /** ModifyIndex value */
  ModifyIndex?: number;
}

/**
 * Check definition for automatic health checks
 */
export interface CheckDefinition {
  /** HTTP endpoint to call */
  HTTP?: string;
  /** Header to add to the request */
  Header?: Record<string, string[]>;
  /** TCP address to test */
  TCP?: string;
  /** TTL duration */
  TTL?: string;
  /** Interval between checks */
  Interval?: string;
  /** Timeout for the check */
  Timeout?: string;
  /** Notes about the check */
  Notes?: string;
  /** Deregister service after being critical for this duration */
  DeregisterCriticalServiceAfter?: string;
  /** TLS configuration for HTTP checks */
  TLSSkipVerify?: boolean;
  /** Script to run for the check */
  Args?: string[];
}

/**
 * Catalog registration payload
 */
export interface CatalogRegistration {
  /** UUID to assign to the node */
  ID?: string;
  /** Node ID to register */
  Node: string;
  /** Address to register */
  Address: string;
  /** Datacenter, defaults to agent's datacenter if not provided */
  Datacenter?: string;
  /** Tagged addresses */
  TaggedAddresses?: Record<string, string>;
  /** Node metadata */
  NodeMeta?: Record<string, string>;
  /** Service to register */
  Service?: Service;
  /** Check to register */
  Check?: Check;
  /** Checks to register (replaces Check) */
  Checks?: Check[];
  /** Whether to skip updating the node's information */
  SkipNodeUpdate?: boolean;
  /** Enterprise - Namespace */
  Namespace?: string;
}

/**
 * Catalog deregistration payload
 */
export interface CatalogDeregistration {
  /** Node ID to deregister */
  Node: string;
  /** Address of the node */
  Address?: string;
  /** Datacenter, defaults to agent's datacenter if not provided */
  Datacenter?: string;
  /** Service ID to deregister */
  ServiceID?: string;
  /** Check ID to deregister */
  CheckID?: string;
  /** Enterprise - Namespace */
  Namespace?: string;
}

/**
 * Key/Value store entry
 */
export interface KVPair {
  /** Key name */
  Key: string;
  /** Creation index */
  CreateIndex: number;
  /** Modification index */
  ModifyIndex: number;
  /** Lock index */
  LockIndex: number;
  /** User-defined flags */
  Flags: number;
  /** Base64 encoded value */
  Value: string;
  /** Session ID holding the lock */
  Session?: string;
}

/**
 * Session creation options
 */
export interface SessionEntry {
  /** Generated ID for the session */
  ID?: string;
  /** Human-readable name for the session */
  Name?: string;
  /** Node the session is associated with */
  Node?: string;
  /** List of node health check IDs */
  Checks?: string[];
  /** List of node health check IDs (newer API) */
  NodeChecks?: string[];
  /** List of service checks */
  ServiceChecks?: ServiceCheck[];
  /** Lock delay duration */
  LockDelay?: string;
  /** Session behavior when agent fails */
  Behavior?: "release" | "delete";
  /** Time to live for the session */
  TTL?: string;
  /** CreateIndex value */
  CreateIndex?: number;
  /** ModifyIndex value */
  ModifyIndex?: number;
}

/**
 * Service check for session creation
 */
export interface ServiceCheck {
  /** ID of the service check */
  ID: string;
  /** Enterprise - Namespace for the service check */
  Namespace?: string;
}

/**
 * Query options for listing services
 */
export interface ServiceListOptions extends BlockingQueryOptions {
  /** Filter by node metadata */
  nodeMeta?: Record<string, string>;
}

/**
 * Options for querying health checks
 */
export interface HealthCheckOptions extends BlockingQueryOptions {
  /** Filter by node metadata */
  nodeMeta?: Record<string, string>;
  /** Node to sort results by round trip time from */
  near?: string;
  /** Filter expression */
  filter?: string;
}

/**
 * Options for querying service health
 */
export interface HealthServiceOptions extends HealthCheckOptions {
  /** Filter by tag (deprecated, use filter instead) */
  tag?: string;
  /** Only return nodes with all passing checks */
  passing?: boolean;
  /** Peer value for imported services */
  peer?: string;
  /** Include fully resolved service definition */
  mergeCentralConfig?: boolean;
  /** Enterprise - Sameness group the service is a member of */
  sg?: string;
}

/**
 * Event payload
 */
export interface Event {
  /** Event ID */
  ID: string;
  /** Event name */
  Name: string;
  /** Event payload */
  Payload: string;
  /** Node name where the event was fired */
  NodeFilter: string;
  /** Service name filter */
  ServiceFilter: string;
  /** Tag filter */
  TagFilter: string;
  /** Version of this event */
  Version: number;
  /** Time the event was created */
  LTime: number;
}

/**
 * Transaction operations
 */
export interface TxnOp {
  /** KV operation */
  KV?: KVTxnOp;
  /** Service operation (future use) */
  Service?: any;
  /** Check operation (future use) */
  Check?: any;
}

/**
 * KV transaction operation
 */
export interface KVTxnOp {
  /** Operation type: set, cas, lock, unlock, get, get-tree, check-index, check-session, check-not-exists, delete, delete-tree, delete-cas */
  Verb: string;
  /** Key */
  Key: string;
  /** Value for set/cas operations, base64 encoded */
  Value?: string;
  /** Index for cas operations */
  Index?: number;
  /** Session ID for lock/unlock operations */
  Session?: string;
  /** Flags for set operations */
  Flags?: number;
}

/**
 * Transaction response
 */
export interface TxnResponse {
  /** Transaction result */
  Results?: TxnResult[];
  /** Errors encountered during transaction */
  Errors?: TxnError[];
}

/**
 * Transaction result
 */
export interface TxnResult {
  /** KV operation result */
  KV?: KVPair;
}

/**
 * Transaction error
 */
export interface TxnError {
  /** Error message */
  OpIndex: number;
  /** What error occurred */
  What: string;
}
