import { ConsulClient } from "../dist";

async function main() {
  try {
    const consul = new ConsulClient({
      host: "localhost",
      port: 8500,
    });

    const result = await consul.status.leader();
    console.log(result);
  } catch (error: any) {
    console.error("Error with custom fetch:", error.message);
  }
}

main().catch((err) => console.error("Error:", err));
