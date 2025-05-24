# Consul Node SDK

This is a [Consul](https://developer.hashicorp.com/consul) SDK for Node.js. The SDK provides a client for interacting with the Consul API.

---

### Built with

- Language: [TypeScript](https://www.typescriptlang.org/)
- Bundler: [tsdown](https://tsdown.dev/)
- Package manager: [pnpm](https://pnpm.io/)

---

### Available Clients

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

### Usage

```typescript
import { ConsulClient } from "./src/client.ts";

// Create a new client
const consul = new ConsulClient({
  host: "localhost",
  port: 8500,
  secure: false,
  token: "your-consul-token", // Optional
});

async function main() {
  // Get the leader
  const leader = await consul.status.leader();
  console.log("Consul leader:", leader);

  // Register a service
  const registeredService = await consul.agent.serviceRegister({
    ID: "my-service-1",
    Name: "my-service",
    Tags: ["tag1", "tag2"],
    Port: 8080,
  });
  console.log("Service registered:", registeredService);

  // Put a value in the KV store
  const kvPut = await consul.kv.put("my-key", "my-value");
  console.log("KV put result:", kvPut);

  // Get a value from the KV store
  const kvValue = await consul.kv.get("my-key");
  console.log("KV value:", kvValue);
}
```

---

### Contributing

Your contributions are welcome! Here's how you can get involved:

- If you find a bug, please [submit an issue](https://github.com/m-t-a97/consul-node-sdk/issues).
- Set up your development environment by following our [Contribution Guide](./contribution-guide.md).
- Contribute code by making a [pull request](https://github.com/m-t-a97/consul-node-sdk/) to enhance features, improve user experience, or fix issues.
- If you want to contribute to providing us with any ideas and features, check out the [Project](./project.md) document.

---
