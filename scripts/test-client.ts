import { ConsulClient } from "../dist";

async function main() {
  // Create a new client
  const consul = new ConsulClient({
    host: "localhost",
    port: 8500,
  });

  // Test that the client was created successfully
  console.log("Consul client created:", consul.baseUrl);
  console.log("HttpClient instance:", consul.httpClient);

  console.log("All client properties are properly initialized:");
  console.log("- agent:", !!consul.agent);
  console.log("- catalog:", !!consul.catalog);
  console.log("- kv:", !!consul.kv);
  console.log("- health:", !!consul.health);
  console.log("- session:", !!consul.session);
  console.log("- event:", !!consul.event);
  console.log("- status:", !!consul.status);
  console.log("- coordinate:", !!consul.coordinate);
  console.log("- query:", !!consul.query);
  console.log("- txn:", !!consul.txn);
  console.log("- snapshot:", !!consul.snapshot);

  // Test the custom fetch implementation option
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

  // Try a simple call to test the custom fetch
  try {
    console.log("Testing custom fetch implementation...");
    await customFetchConsul.status.leader();
    console.log("Custom fetch implementation works!");
  } catch (error: any) {
    console.error("Error with custom fetch:", error.message);
  }
}

main().catch((err) => console.error("Error:", err));
