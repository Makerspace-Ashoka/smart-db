import { beforeEach, describe, expect, it, vi } from "vitest";

const listen = vi.fn();
const info = vi.fn();
const error = vi.fn();
const buildServer = vi.fn(async () => ({
  listen,
  log: {
    info,
    error,
  },
}));

vi.mock("./server.js", () => ({
  buildServer,
}));

vi.mock("./config.js", () => ({
  config: {
    port: 4999,
  },
}));

describe("startServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listens using the configured port", async () => {
    listen.mockResolvedValue(undefined);

    const { startServer } = await import("./index");
    await startServer();

    expect(buildServer).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith({
      host: "0.0.0.0",
      port: 4999,
    });
    expect(info).toHaveBeenCalledWith("Smart DB middleware listening on 4999");
  });

  it("logs and rethrows startup failures", async () => {
    const startupFailure = new Error("listen failed");
    listen.mockRejectedValue(startupFailure);

    const { startServer } = await import("./index");
    await expect(startServer()).rejects.toThrowError("listen failed");
    expect(error).toHaveBeenCalledWith(startupFailure);
  });

  it("runs from CLI only when the current module matches argv and exits on failure", async () => {
    const exit = vi.fn();
    const { runCli } = await import("./index");

    listen.mockResolvedValue(undefined);
    await runCli("file:///tmp/index.ts", "/tmp/other.ts", exit);
    expect(buildServer).not.toHaveBeenCalled();

    listen.mockRejectedValue(new Error("cli failed"));
    await runCli("file:///tmp/index.ts", "/tmp/index.ts", exit);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("runs from CLI with the default argv path and does not exit on success", async () => {
    const exit = vi.fn();
    const { runCli } = await import("./index");
    const previousArgv = process.argv[1];
    process.argv[1] = "/tmp/cli-index.ts";
    listen.mockResolvedValue(undefined);

    await runCli("file:///tmp/cli-index.ts", undefined, exit);

    expect(buildServer).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
    process.argv[1] = previousArgv;
  });

  it("treats nullish argv paths as non-matching", async () => {
    const exit = vi.fn();
    const { runCli } = await import("./index");

    await runCli("file:///tmp/index.ts", null as unknown as string, exit);

    expect(buildServer).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });
});
