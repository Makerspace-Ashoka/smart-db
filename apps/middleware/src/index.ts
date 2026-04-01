import { pathToFileURL } from "node:url";
import { config } from "./config.js";
import { buildServer } from "./server.js";

export async function startServer() {
  const server = await buildServer();

  try {
    await server.listen({
      host: "0.0.0.0",
      port: config.port,
    });
    server.log.info(`Smart DB middleware listening on ${config.port}`);
    return server;
  } catch (error) {
    server.log.error(error);
    throw error;
  }
}

export async function runCli(
  currentModuleUrl: string,
  argvPath: string | undefined = process.argv[1],
  exit: (code: number) => never | void = process.exit,
) {
  if (currentModuleUrl !== pathToFileURL(argvPath ?? "").href) {
    return;
  }

  try {
    await startServer();
  } catch {
    exit(1);
  }
}

await runCli(import.meta.url);
