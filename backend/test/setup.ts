import { afterEach } from "vitest";
import { violations } from "./contract";

// Fails the test that produced a response not matching openapi.yaml (#32).
afterEach(() => {
  const found = violations.splice(0);
  if (found.length) throw new Error(`Responses must match openapi.yaml:\n${found.join("\n")}`);
});
