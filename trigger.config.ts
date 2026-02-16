import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_nkpgykggftkokbvszelk", // Replace with your Trigger.dev project ID
  runtime: "node",
  logLevel: "log",
  maxDuration: 600, // 10 minutes - enough for terraform apply
  dirs: ["./src/trigger"],
});
