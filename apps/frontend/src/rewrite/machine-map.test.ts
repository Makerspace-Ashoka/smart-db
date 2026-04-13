import { describe, expect, it } from "vitest";
import { rewriteMachineMap } from "./machine-map";
import { implementedRewriteMachines } from "./machines";

describe("rewriteMachineMap", () => {
  it("declares an initial state that exists in every machine", () => {
    for (const blueprint of Object.values(rewriteMachineMap)) {
      expect(blueprint.states).toContain(blueprint.initial);
    }
  });

  it("only references known failure states", () => {
    for (const blueprint of Object.values(rewriteMachineMap)) {
      for (const state of blueprint.failureStates) {
        expect(blueprint.states).toContain(state);
      }
    }
  });

  it("does not duplicate state names or event names within a machine", () => {
    for (const blueprint of Object.values(rewriteMachineMap)) {
      expect(new Set(blueprint.states).size).toBe(blueprint.states.length);
      expect(new Set(blueprint.events).size).toBe(blueprint.events.length);
    }
  });

  it("marks implemented machines explicitly and keeps them in sync with actual exports", () => {
    const implementedInMap = Object.entries(rewriteMachineMap)
      .filter(([, blueprint]) => blueprint.status === "implemented")
      .map(([id]) => id)
      .sort();
    const implementedInCode = Object.keys(implementedRewriteMachines).sort();

    expect(implementedInMap).toEqual(implementedInCode);
  });
});
