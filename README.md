# Consul Node SDK

This is a Consul SDK for Node.js. The SDK provides a client for interacting with the Consul API.

## Features

- Uses native fetch API instead of external dependencies
- Supports all Consul API endpoints
- Provides a consistent async/await interface
- Allows custom fetch implementations
- Type definitions for all Consul API requests and responses

## Usage

```typescript
import { ConsulClient } from "./src/client.ts";

// Create a new client
const consul = new ConsulClient({
  host: "localhost",
  port: 8500,
  secure: false,
  token: "your-consul-token", // Optional
});

// Use the client
async function main() {
  // Get the leader
  const leader = await consul.status.leader();
  console.log("Consul leader:", leader);

  // Register a service
  const serviceRegistered = await consul.agent.serviceRegister({
    ID: "my-service-1",
    Name: "my-service",
    Tags: ["tag1", "tag2"],
    Port: 8080,
  });
  console.log("Service registered:", serviceRegistered);

  // Put a value in the KV store
  const kvPut = await consul.kv.put("my-key", "my-value");
  console.log("KV put result:", kvPut);

  // Get a value from the KV store
  const kvValue = await consul.kv.get("my-key");
  console.log("KV value:", kvValue);
}

// Using a custom fetch implementation
const customFetchConsul = new ConsulClient({
  host: "localhost",
  port: 8500,
  fetchFn: async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    console.log("Custom fetch called with URL:", input);
    return fetch(input, init) as any;
  },
});
```

## Client Options

The `ConsulClient` constructor accepts the following options:

- `host`: The address of the Consul agent (default: `localhost`)
- `port`: The port of the Consul agent (default: `8500`)
- `secure`: Whether to use HTTPS (default: `false`)
- `token`: The Consul token to use for authentication
- `dc`: The datacenter to use for queries
- `namespace`: The namespace to use for queries (Enterprise only)
- `partition`: The partition to use for queries (Enterprise only)
- `headers`: Additional HTTP headers to include in all requests
- `fetchFn`: Custom fetch implementation

## Available Clients

- `agent`: Consul agent API
- `catalog`: Consul catalog API
- `kv`: Consul KV store API
- `health`: Consul health API
- `session`: Consul session API
- `event`: Consul event API
- `status`: Consul status API
- `coordinate`: Consul coordinate API
- `query`: Consul prepared query API
- `txn`: Consul transaction API
- `snapshot`: Consul snapshot API

---
