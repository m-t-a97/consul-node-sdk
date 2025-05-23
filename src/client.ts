import type {
  BlockingQueryOptions,
  CatalogDeregistration,
  CatalogRegistration,
  Check,
  ConsulBaseOptions,
  Event,
  FetchFn,
  FetchRequestOptions,
  HealthCheckOptions,
  HealthServiceOptions,
  KVPair,
  Node,
  Service,
  ServiceListOptions,
  SessionEntry,
  TxnOp,
  TxnResponse
} from "./types";

/**
 * Utility class to handle HTTP requests with fetch
 */
class HttpClient {
  private _baseUrl: string;
  private _defaultHeaders: Record<string, string>;
  private _fetchFn: FetchFn;

  /**
   * Creates a new HttpClient instance
   * @param baseUrl - Base URL for requests
   * @param headers - Default headers to include in requests
   * @param fetchFn - Custom fetch implementation
   */
  constructor(
    baseUrl: string,
    headers: Record<string, string> = {},
    fetchFn: FetchFn = fetch
  ) {
    this._baseUrl = baseUrl;
    this._defaultHeaders = headers;
    this._fetchFn = fetchFn;
  }

  /**
   * Builds a URL with query parameters
   * @param path - URL path
   * @param params - Query parameters
   * @returns Complete URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, any>): string {
    const url = new URL(
      path.startsWith("http") ? path : `${this._baseUrl}${path}`
    );

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          // Handle array values
          if (Array.isArray(value)) {
            for (const v of value) {
              url.searchParams.append(key, v.toString());
            }
          } else {
            url.searchParams.append(key, value.toString());
          }
        }
      }
    }

    return url.toString();
  }

  /**
   * Performs an HTTP request
   * @param method - HTTP method
   * @param path - URL path
   * @param options - Request options
   * @returns Response data
   */
  private async request<T>(
    method: string,
    path: string,
    options: FetchRequestOptions = {}
  ): Promise<T> {
    const {
      params,
      body,
      headers = {},
      responseType = "json",
      ...rest
    } = options;

    const url = this.buildUrl(path, params);

    const requestHeaders = {
      ...this._defaultHeaders,
      ...headers
    };

    // Set default content type if sending a body
    if (body && !requestHeaders["Content-Type"]) {
      if (
        typeof body === "string" ||
        body instanceof ArrayBuffer ||
        body instanceof Blob
      ) {
        // Don't set content-type for FormData (browser will set it with boundary)
        requestHeaders["Content-Type"] = "application/octet-stream";
      } else {
        requestHeaders["Content-Type"] = "application/json";
      }
    }

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      ...rest
    };

    // Handle body based on content type
    if (body !== undefined) {
      if (
        requestHeaders["Content-Type"] === "application/json" &&
        typeof body === "object"
      ) {
        requestInit.body = JSON.stringify(body);
      } else {
        requestInit.body = body;
      }
    }

    const response = await this._fetchFn(url, requestInit);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `HTTP request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    // Handle different response types
    let data: any;
    if (responseType === "arraybuffer") {
      data = await response.arrayBuffer();
    } else if (responseType === "blob") {
      data = await response.blob();
    } else if (responseType === "text") {
      data = await response.text();
    } else {
      // Default to JSON
      if (response.headers.get("content-length") === "0") {
        data = null;
      } else {
        try {
          data = await response.json();
        } catch (e) {
          // If response is not valid JSON, return text instead
          data = await response.text();
        }
      }
    }

    return data as T;
  }

  /**
   * Performs a GET request
   * @param path - URL path
   * @param options - Request options
   * @returns Response data
   */
  async get<T>(path: string, options: FetchRequestOptions = {}): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  /**
   * Performs a POST request
   * @param path - URL path
   * @param body - Request body
   * @param options - Request options
   * @returns Response data
   */
  async post<T>(
    path: string,
    body?: any,
    options: FetchRequestOptions = {}
  ): Promise<T> {
    return this.request<T>("POST", path, { ...options, body });
  }

  /**
   * Performs a PUT request
   * @param path - URL path
   * @param body - Request body
   * @param options - Request options
   * @returns Response data
   */
  async put<T>(
    path: string,
    body?: any,
    options: FetchRequestOptions = {}
  ): Promise<T> {
    return this.request<T>("PUT", path, { ...options, body });
  }

  /**
   * Performs a DELETE request
   * @param path - URL path
   * @param options - Request options
   * @returns Response data
   */
  async delete<T>(path: string, options: FetchRequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }
}

/**
 * ConsulAgent class for interacting with the Consul agent API
 */
export class ConsulAgent {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new ConsulAgent instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Returns information about the local agent
   * @param options - Query options
   * @returns Agent information
   */
  async self(options?: ConsulBaseOptions): Promise<any> {
    const url = "/agent/self";
    return this._client.get(url, { params: options });
  }

  /**
   * Returns the members that the agent sees in the cluster
   * @param options - Query options
   * @returns Cluster members
   */
  async members(
    options?: ConsulBaseOptions & { wan?: boolean }
  ): Promise<any[]> {
    const url = "/agent/members";
    return this._client.get(url, { params: options });
  }

  /**
   * Registers a new service with the local agent
   * @param service - Service definition
   * @param options - Query options
   * @returns Whether the service was registered
   */
  async serviceRegister(
    service: Service,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = "/agent/service/register";
      await this._client.put(url, service, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Deregisters a service with the local agent
   * @param serviceId - ID of the service to deregister
   * @param options - Query options
   * @returns Whether the service was deregistered
   */
  async serviceDeregister(
    serviceId: string,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = `/agent/service/deregister/${serviceId}`;
      await this._client.put(url, null, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Returns the services that the local agent is aware of
   * @param options - Query options
   * @returns Dictionary of service IDs to services
   */
  async services(
    options?: ConsulBaseOptions
  ): Promise<Record<string, Service>> {
    const url = "/agent/services";
    return this._client.get(url, { params: options });
  }

  /**
   * Registers a new check with the local agent
   * @param check - Check definition
   * @param options - Query options
   * @returns Whether the check was registered
   */
  async checkRegister(
    check: Check,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = "/agent/check/register";
      await this._client.put(url, check, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Deregisters a check with the local agent
   * @param checkId - ID of the check to deregister
   * @param options - Query options
   * @returns Whether the check was deregistered
   */
  async checkDeregister(
    checkId: string,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = `/agent/check/deregister/${checkId}`;
      await this._client.put(url, null, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Returns the checks that the local agent is aware of
   * @param options - Query options
   * @returns Dictionary of check IDs to checks
   */
  async checks(options?: ConsulBaseOptions): Promise<Record<string, Check>> {
    const url = "/agent/checks";
    return this._client.get(url, { params: options });
  }

  /**
   * Forces the local agent to join a node
   * @param address - Address of the node to join
   * @param options - Query options
   * @returns Whether the node was joined
   */
  async join(
    address: string,
    options?: ConsulBaseOptions & { wan?: boolean }
  ): Promise<boolean> {
    try {
      const url = `/agent/join/${address}`;
      await this._client.put(url, null, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Forces the local agent to leave the cluster
   * @param options - Query options
   * @returns Whether the agent left
   */
  async leave(options?: ConsulBaseOptions): Promise<boolean> {
    try {
      const url = "/agent/leave";
      await this._client.put(url, null, { params: options });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Forces the local agent to reload its configuration
   * @param options - Query options
   * @returns Whether the agent reloaded
   */
  async reload(options?: ConsulBaseOptions): Promise<boolean> {
    try {
      const url = "/agent/reload";
      await this._client.put(url, null, { params: options });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Returns the metrics data from the local agent
   * @param options - Query options
   * @returns Metrics data
   */
  async metrics(
    options?: ConsulBaseOptions & { format?: string }
  ): Promise<any> {
    const url = "/agent/metrics";
    return this._client.get(url, { params: options });
  }

  /**
   * Sets a check to a specific state
   * @param checkId - ID of the check to update
   * @param state - New state: passing, warning, or critical
   * @param options - Query options
   * @returns Whether the check was updated
   */
  async checkUpdate(
    checkId: string,
    state: "passing" | "warning" | "critical",
    options?: ConsulBaseOptions & { note?: string }
  ): Promise<boolean> {
    try {
      const url = `/agent/check/update/${checkId}`;
      await this._client.put(
        url,
        { Status: state, Output: options?.note },
        { params: options }
      );
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  /**
   * Returns the local agent's configuration and member information
   * @param options - Query options
   * @returns Agent configuration and member information
   */
  async connect(options?: ConsulBaseOptions): Promise<any> {
    const url = "/agent/connect";
    return this._client.get(url, { params: options });
  }
}

/**
 * CatalogClient class for interacting with the Consul catalog API
 */
export class CatalogClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new CatalogClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul catalog API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Registers an entity (node, service, check) with the catalog
   * @param registration - Entity registration
   * @param options - Query options
   * @returns Whether the entity was registered
   */
  async register(
    registration: CatalogRegistration,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = "/catalog/register";
      await this._client.put(url, registration, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Deregisters an entity (node, service, check) from the catalog
   * @param deregistration - Entity deregistration
   * @param options - Query options
   * @returns Whether the entity was deregistered
   */
  async deregister(
    deregistration: CatalogDeregistration,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = "/catalog/deregister";
      await this._client.put(url, deregistration, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Lists all datacenters known to Consul
   * @param options - Query options
   * @returns List of datacenters
   */
  async datacenters(options?: ConsulBaseOptions): Promise<string[]> {
    const url = "/catalog/datacenters";
    return this._client.get(url, { params: options });
  }

  /**
   * Lists all nodes in the catalog
   * @param options - Query options
   * @returns List of nodes
   */
  async nodes(
    options?: BlockingQueryOptions & {
      nodeMeta?: Record<string, string>;
      filter?: string;
    }
  ): Promise<Node[]> {
    const url = "/catalog/nodes";
    const params = this._prepareBlockingParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Lists all services in the catalog
   * @param options - Query options
   * @returns Dictionary of service names to tags
   */
  async services(
    options?: ServiceListOptions
  ): Promise<Record<string, string[]>> {
    const url = "/catalog/services";
    const params = this._prepareBlockingParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Lists nodes for a specific service
   * @param service - Service name
   * @param options - Query options
   * @returns List of service nodes
   */
  async service(
    service: string,
    options?: BlockingQueryOptions & {
      tag?: string;
      nodeMeta?: Record<string, string>;
      filter?: string;
    }
  ): Promise<Service[]> {
    const url = `/catalog/service/${service}`;
    const params = this._prepareBlockingParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Lists nodes for a mesh-capable service
   * @param service - Service name
   * @param options - Query options
   * @returns List of service nodes
   */
  async connect(
    service: string,
    options?: BlockingQueryOptions & {
      tag?: string;
      nodeMeta?: Record<string, string>;
      filter?: string;
    }
  ): Promise<Service[]> {
    const url = `/catalog/connect/${service}`;
    const params = this._prepareBlockingParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Lists services for a specific node
   * @param node - Node name
   * @param options - Query options
   * @returns List of services
   */
  async nodeServices(
    node: string,
    options?: BlockingQueryOptions
  ): Promise<{ Node: Node; Services: Record<string, Service> }> {
    const url = `/catalog/node/${node}`;
    const params = this._prepareBlockingParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Lists services for a gateway
   * @param gateway - Gateway name
   * @param options - Query options
   * @returns List of services
   */
  async gatewayServices(
    gateway: string,
    options?: BlockingQueryOptions
  ): Promise<any[]> {
    const url = `/catalog/gateway-services/${gateway}`;
    const params = this._prepareBlockingParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Prepares parameters for blocking queries
   * @param options - Blocking query options
   * @returns Prepared parameters
   */
  private _prepareBlockingParams(
    options?: BlockingQueryOptions & Record<string, any>
  ): Record<string, any> {
    if (!options) return {};

    const params: Record<string, any> = { ...options };

    if (options.index) {
      params.index = options.index;
    }

    if (options.wait) {
      params.wait = options.wait;
    }

    if (options.consistency) {
      if (options.consistency === "consistent") {
        params.consistent = true;
      } else if (options.consistency === "stale") {
        params.stale = true;
      }
      params.consistency = undefined;
    }

    if (options.nodeMeta && typeof options.nodeMeta === "object") {
      for (const [key, value] of Object.entries(options.nodeMeta)) {
        params[`node-meta=${key}`] = value;
      }
      params.nodeMeta = undefined;
    }

    return params;
  }
}

/**
 * HealthClient class for interacting with the Consul health API
 */
export class HealthClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new HealthClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul health API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Returns the health checks for a node
   * @param node - Node name
   * @param options - Query options
   * @returns List of checks
   */
  async node(node: string, options?: HealthCheckOptions): Promise<Check[]> {
    const url = `/health/node/${node}`;
    const params = this._prepareParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Returns the checks for a service
   * @param service - Service name
   * @param options - Query options
   * @returns List of checks
   */
  async checks(
    service: string,
    options?: HealthCheckOptions
  ): Promise<Check[]> {
    const url = `/health/checks/${service}`;
    const params = this._prepareParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Returns the nodes and health info for a service
   * @param service - Service name
   * @param options - Query options
   * @returns List of service instances with health data
   */
  async service(
    service: string,
    options?: HealthServiceOptions
  ): Promise<Array<{ Node: Node; Service: Service; Checks: Check[] }>> {
    const url = `/health/service/${service}`;
    const params = this._prepareParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Returns the nodes and health info for a mesh-capable service
   * @param service - Service name
   * @param options - Query options
   * @returns List of service instances with health data
   */
  async connect(
    service: string,
    options?: HealthServiceOptions
  ): Promise<Array<{ Node: Node; Service: Service; Checks: Check[] }>> {
    const url = `/health/connect/${service}`;
    const params = this._prepareParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Returns the nodes providing an ingress gateway for a service
   * @param service - Service name
   * @param options - Query options
   * @returns List of service instances with health data
   */
  async ingress(
    service: string,
    options?: HealthServiceOptions
  ): Promise<Array<{ Node: Node; Service: Service; Checks: Check[] }>> {
    const url = `/health/ingress/${service}`;
    const params = this._prepareParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Returns all checks that are in a critical state
   * @param options - Query options
   * @returns List of critical checks
   */
  async state(
    state: "passing" | "warning" | "critical" | "any",
    options?: HealthCheckOptions
  ): Promise<Check[]> {
    const url = `/health/state/${state}`;
    const params = this._prepareParams(options);
    return this._client.get(url, { params });
  }

  /**
   * Prepares parameters for health API requests
   * @param options - Health API options
   * @returns Prepared parameters
   */
  private _prepareParams(
    options?: HealthCheckOptions & Record<string, any>
  ): Record<string, any> {
    if (!options) return {};

    const params: Record<string, any> = { ...options };

    if (options.index) {
      params.index = options.index;
    }

    if (options.wait) {
      params.wait = options.wait;
    }

    if (options.consistency) {
      if (options.consistency === "consistent") {
        params.consistent = true;
      } else if (options.consistency === "stale") {
        params.stale = true;
      }
      params.consistency = undefined;
    }

    if (options.nodeMeta && typeof options.nodeMeta === "object") {
      for (const [key, value] of Object.entries(options.nodeMeta)) {
        params[`node-meta=${key}`] = value;
      }
      params.nodeMeta = undefined;
    }

    if (options.passing) {
      params.passing = true;
    }

    if (options.mergeCentralConfig) {
      params["merge-central-config"] = true;
      params.mergeCentralConfig = undefined;
    }

    return params;
  }
}

/**
 * KVClient class for interacting with the Consul key/value store API
 */
export class KVClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new KVClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul KV API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Gets a value from the key/value store
   * @param key - Key to get
   * @param options - Query options
   * @returns Key/value pair or null if not found
   */
  async get(
    key: string,
    options?: BlockingQueryOptions & { raw?: boolean }
  ): Promise<KVPair | null> {
    const url = `/kv/${key}`;
    const params = { ...options };

    try {
      const response = await this._client.get(url, {
        params
      });

      if (!response || (Array.isArray(response) && response.length === 0)) {
        return null;
      }

      if (options?.raw) {
        return response as KVPair;
      }

      return Array.isArray(response)
        ? (response[0] as KVPair)
        : (response as KVPair);
    } catch (error: unknown) {
      return null;
    }
  }

  /**
   * Gets all keys with a prefix
   * @param prefix - Key prefix
   * @param options - Query options
   * @returns List of key/value pairs
   */
  async keys(
    prefix: string,
    options?: BlockingQueryOptions & { separator?: string }
  ): Promise<string[]> {
    const url = `/kv/${prefix}`;
    const params = { ...options, keys: true };

    try {
      const response = await this._client.get(url, {
        params
      });

      if (!response) {
        return [];
      }

      return response as string[];
    } catch (error: unknown) {
      return [];
    }
  }

  /**
   * Recursively gets all values with a prefix
   * @param prefix - Key prefix
   * @param options - Query options
   * @returns List of key/value pairs
   */
  async list(
    prefix: string,
    options?: BlockingQueryOptions
  ): Promise<KVPair[]> {
    const url = `/kv/${prefix}`;
    const params = { ...options, recurse: true };

    try {
      const response = await this._client.get(url, {
        params
      });

      if (!response) {
        return [];
      }

      return response as KVPair[];
    } catch (error: unknown) {
      return [];
    }
  }

  /**
   * Puts a value in the key/value store
   * @param key - Key to put
   * @param value - Value to put
   * @param options - Query options
   * @returns Whether the value was put
   */
  async put(
    key: string,
    value: string | Buffer,
    options?: ConsulBaseOptions & {
      flags?: number;
      cas?: number;
      acquire?: string;
      release?: string;
    }
  ): Promise<boolean> {
    try {
      const url = `/kv/${key}`;
      await this._client.put(url, value, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Deletes a value from the key/value store
   * @param key - Key to delete
   * @param options - Query options
   * @returns Whether the value was deleted
   */
  async delete(
    key: string,
    options?: ConsulBaseOptions & { recurse?: boolean }
  ): Promise<boolean> {
    try {
      const url = `/kv/${key}`;
      await this._client.delete(url, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }
}

/**
 * SessionClient class for interacting with the Consul session API
 */
export class SessionClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new SessionClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul session API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Creates a new session
   * @param session - Session entry
   * @param options - Query options
   * @returns Session ID
   */
  async create(
    session: Partial<SessionEntry>,
    options?: ConsulBaseOptions
  ): Promise<string> {
    const url = "/session/create";
    const response = await this._client.put(url, session, { params: options });
    return (response as SessionEntry).ID;
  }

  /**
   * Destroys a session
   * @param sessionId - Session ID
   * @param options - Query options
   * @returns Whether the session was destroyed
   */
  async destroy(
    sessionId: string,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = `/session/destroy/${sessionId}`;
      await this._client.put(url, null, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Reads a session
   * @param sessionId - Session ID
   * @param options - Query options
   * @returns Session entry
   */
  async info(
    sessionId: string,
    options?: BlockingQueryOptions
  ): Promise<SessionEntry | null> {
    const url = `/session/info/${sessionId}`;
    const params = { ...options };

    try {
      const response = await this._client.get(url, {
        params
      });

      if (!response || (Array.isArray(response) && response.length === 0)) {
        return null;
      }

      return Array.isArray(response) ? response[0] : response;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Lists sessions for a node
   * @param node - Node name
   * @param options - Query options
   * @returns List of sessions
   */
  async node(
    node: string,
    options?: BlockingQueryOptions
  ): Promise<SessionEntry[]> {
    const url = `/session/node/${node}`;
    const params = { ...options };
    return this._client.get(url, { params });
  }

  /**
   * Lists all sessions
   * @param options - Query options
   * @returns List of sessions
   */
  async list(options?: BlockingQueryOptions): Promise<SessionEntry[]> {
    const url = "/session/list";
    const params = { ...options };
    return this._client.get(url, { params });
  }

  /**
   * Renews a session
   * @param sessionId - Session ID
   * @param options - Query options
   * @returns Renewed session
   */
  async renew(
    sessionId: string,
    options?: ConsulBaseOptions
  ): Promise<SessionEntry | null> {
    try {
      const url = `/session/renew/${sessionId}`;
      const response = await this._client.put(url, null, {
        params: options
      });

      if (!response || (Array.isArray(response) && response.length === 0)) {
        return null;
      }

      return Array.isArray(response) ? response[0] : response;
    } catch (error: unknown) {
      console.error(error);
      return null;
    }
  }
}

/**
 * EventClient class for interacting with the Consul event API
 */
export class EventClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new EventClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul event API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Fires a new event
   * @param name - Event name
   * @param payload - Event payload
   * @param options - Query options
   * @returns Event
   */
  async fire(
    name: string,
    payload?: string | Buffer,
    options?: ConsulBaseOptions & {
      node?: string;
      service?: string;
      tag?: string;
    }
  ): Promise<Event> {
    const url = `/event/fire/${name}`;
    const params: Record<string, any> = { ...options };

    if (options?.node) {
      params.node = options.node;
    }

    if (options?.service) {
      params.service = options.service;
    }

    if (options?.tag) {
      params.tag = options.tag;
    }

    return this._client.put(url, payload, { params });
  }

  /**
   * Lists events
   * @param options - Query options
   * @returns List of events
   */
  async list(
    options?: BlockingQueryOptions & { name?: string }
  ): Promise<Event[]> {
    const url = "/event/list";
    const params = { ...options };
    return this._client.get(url, { params });
  }
}

/**
 * StatusClient class for interacting with the Consul status API
 */
export class StatusClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new StatusClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul status API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Returns the Consul leader
   * @param options - Query options
   * @returns Leader address
   */
  async leader(options?: ConsulBaseOptions): Promise<string> {
    const url = "/status/leader";
    return this._client.get(url, { params: options });
  }

  /**
   * Returns the Consul peers
   * @param options - Query options
   * @returns List of peers
   */
  async peers(options?: ConsulBaseOptions): Promise<string[]> {
    const url = "/status/peers";
    return this._client.get(url, { params: options });
  }
}

/**
 * CoordinateClient class for interacting with the Consul coordinate API
 */
export class CoordinateClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new CoordinateClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul coordinate API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Returns the network coordinates for nodes in the datacenter
   * @param options - Query options
   * @returns List of coordinates
   */
  async nodes(options?: BlockingQueryOptions): Promise<any[]> {
    const url = "/coordinate/nodes";
    const params = { ...options };
    return this._client.get(url, { params });
  }

  /**
   * Returns the network coordinates for a single node
   * @param node - Node name
   * @param options - Query options
   * @returns Coordinates
   */
  async node(node: string, options?: BlockingQueryOptions): Promise<any> {
    try {
      const url = `/coordinate/node/${node}`;
      const params = { ...options };
      const response = await this._client.get(url, {
        params
      });

      if (!response || (Array.isArray(response) && response.length === 0)) {
        return null;
      }

      return Array.isArray(response) ? response[0] : response;
    } catch (error: unknown) {
      console.error(error);
      return null;
    }
  }

  /**
   * Returns the network coordinates for datacenters
   * @param options - Query options
   * @returns List of coordinates
   */
  async datacenters(options?: ConsulBaseOptions): Promise<any[]> {
    const url = "/coordinate/datacenters";
    return this._client.get(url, { params: options });
  }
}

/**
 * QueryClient class for interacting with the Consul prepared query API
 */
export class QueryClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new QueryClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul query API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Creates a new prepared query
   * @param query - Query definition
   * @param options - Query options
   * @returns Query ID
   */
  async create(query: any, options?: ConsulBaseOptions): Promise<string> {
    const url = "/query";
    return this._client.post(url, query, { params: options });
  }

  /**
   * Updates a prepared query
   * @param queryId - Query ID
   * @param query - Query definition
   * @param options - Query options
   * @returns Whether the query was updated
   */
  async update(
    queryId: string,
    query: any,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = `/query/${queryId}`;
      await this._client.put(url, query, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Lists prepared queries
   * @param options - Query options
   * @returns List of queries
   */
  async list(options?: ConsulBaseOptions): Promise<any[]> {
    const url = "/query";
    return this._client.get(url, { params: options });
  }

  /**
   * Gets a prepared query
   * @param queryId - Query ID
   * @param options - Query options
   * @returns Query definition
   */
  async get(queryId: string, options?: ConsulBaseOptions): Promise<any> {
    try {
      const url = `/query/${queryId}`;
      const response = await this._client.get(url, {
        params: options
      });

      if (!response || (Array.isArray(response) && response.length === 0)) {
        return null;
      }

      return Array.isArray(response) ? response[0] : response;
    } catch (error: unknown) {
      console.error(error);
      return null;
    }
  }

  /**
   * Deletes a prepared query
   * @param queryId - Query ID
   * @param options - Query options
   * @returns Whether the query was deleted
   */
  async delete(queryId: string, options?: ConsulBaseOptions): Promise<boolean> {
    try {
      const url = `/query/${queryId}`;
      await this._client.delete(url, { params: options });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }

  /**
   * Executes a prepared query
   * @param queryIdOrName - Query ID or name
   * @param options - Query options
   * @returns Query results
   */
  async execute(
    queryIdOrName: string,
    options?: ConsulBaseOptions & { near?: string; limit?: number }
  ): Promise<any> {
    const url = `/query/${queryIdOrName}/execute`;
    return this._client.get(url, { params: options });
  }
}

/**
 * TxnClient class for interacting with the Consul transaction API
 */
export class TxnClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new TxnClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul transaction API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Creates a new transaction
   * @param operations - Transaction operations
   * @param options - Query options
   * @returns Transaction response
   */
  async create(
    operations: TxnOp[],
    options?: ConsulBaseOptions
  ): Promise<TxnResponse> {
    const url = "/txn";
    return this._client.put(url, operations, { params: options });
  }
}

/**
 * SnapshotClient class for interacting with the Consul snapshot API
 */
export class SnapshotClient {
  private _client: HttpClient;
  private _baseUrl: string;

  /**
   * Creates a new SnapshotClient instance
   * @param client - HttpClient instance for making HTTP requests
   * @param baseUrl - Base URL for the Consul snapshot API
   */
  constructor(client: HttpClient, baseUrl: string) {
    this._client = client;
    this._baseUrl = baseUrl;
  }

  /**
   * Generates a new snapshot
   * @param options - Query options
   * @returns Snapshot data
   */
  async save(options?: ConsulBaseOptions): Promise<ArrayBuffer> {
    const url = "/snapshot";
    return this._client.get(url, {
      params: options,
      responseType: "arraybuffer"
    });
  }

  /**
   * Restores a snapshot
   * @param snapshot - Snapshot data
   * @param options - Query options
   * @returns Whether the snapshot was restored
   */
  async restore(
    snapshot: ArrayBuffer | Buffer,
    options?: ConsulBaseOptions
  ): Promise<boolean> {
    try {
      const url = "/snapshot";
      await this._client.put(url, snapshot, {
        params: options,
        headers: { "Content-Type": "application/octet-stream" }
      });
      return true;
    } catch (error: unknown) {
      console.error(error);
      return false;
    }
  }
}

/**
 * Consul client options
 */
export interface ConsulClientOptions {
  /** The address of the Consul agent */
  host?: string;
  /** The port of the Consul agent */
  port?: number;
  /** Whether to use HTTPS */
  secure?: boolean;
  /** The Consul token to use for authentication */
  token?: string;
  /** The datacenter to use for queries */
  dc?: string;
  /** The namespace to use for queries (Enterprise only) */
  namespace?: string;
  /** The partition to use for queries (Enterprise only) */
  partition?: string;
  /** Default headers to include in requests */
  headers?: Record<string, string>;
  /** Custom fetch implementation */
  fetchFn?: FetchFn;
}

/**
 * Main Consul client class for interacting with the Consul API.
 * Provides access to all Consul API endpoints through dedicated class instances.
 */
export class ConsulClient {
  private _httpClient: HttpClient;
  private _baseUrl: string;

  /** Consul agent API client */
  public readonly agent: ConsulAgent;
  /** Consul catalog API client */
  public readonly catalog: CatalogClient;
  /** Consul KV store API client */
  public readonly kv: KVClient;
  /** Consul health API client */
  public readonly health: HealthClient;
  /** Consul session API client */
  public readonly session: SessionClient;
  /** Consul event API client */
  public readonly event: EventClient;
  /** Consul status API client */
  public readonly status: StatusClient;
  /** Consul coordinate API client */
  public readonly coordinate: CoordinateClient;
  /** Consul prepared query API client */
  public readonly query: QueryClient;
  /** Consul transaction API client */
  public readonly txn: TxnClient;
  /** Consul snapshot API client */
  public readonly snapshot: SnapshotClient;

  /**
   * Creates a new ConsulClient instance
   * @param options - Client options
   */
  constructor(options: ConsulClientOptions = {}) {
    const host = options.host || "localhost";
    const port = options.port || 8500;
    const secure = options.secure || false;
    const protocol = secure ? "https" : "http";

    this._baseUrl = `${protocol}://${host}:${port}/v1`;

    const headers: Record<string, string> = {
      ...(options.headers || {})
    };

    if (options.token) {
      headers["X-Consul-Token"] = options.token;
    }

    this._httpClient = new HttpClient(this._baseUrl, headers, options.fetchFn);

    // Initialize API clients
    this.agent = new ConsulAgent(this._httpClient, this._baseUrl);
    this.catalog = new CatalogClient(this._httpClient, this._baseUrl);
    this.health = new HealthClient(this._httpClient, this._baseUrl);
    this.kv = new KVClient(this._httpClient, this._baseUrl);
    this.session = new SessionClient(this._httpClient, this._baseUrl);
    this.event = new EventClient(this._httpClient, this._baseUrl);
    this.status = new StatusClient(this._httpClient, this._baseUrl);
    this.coordinate = new CoordinateClient(this._httpClient, this._baseUrl);
    this.query = new QueryClient(this._httpClient, this._baseUrl);
    this.txn = new TxnClient(this._httpClient, this._baseUrl);
    this.snapshot = new SnapshotClient(this._httpClient, this._baseUrl);
  }

  /**
   * Gets the base URL for the Consul API
   * @returns Base URL
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * Gets the HTTP client used by this Consul client
   * @returns HTTP client
   */
  get httpClient(): HttpClient {
    return this._httpClient;
  }
}
