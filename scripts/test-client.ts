import { ConsulClient } from "../dist";

async function main() {
  try {
    const consul = new ConsulClient({
      host: "localhost",
      port: 8500
    });

    const leader = await consul.status.leader();
    console.log("Leader:", leader);

    const services = await consul.agent.services();
    console.log("Services:", services);
  } catch (error: any) {
    console.error("Error with custom fetch:", error.message);
  }
}

main().catch((err) => console.error("Error:", err));
