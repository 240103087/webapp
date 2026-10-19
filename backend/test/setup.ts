import { afterEach } from "vitest";
import { violations } from "./contract";
import { openStores } from "./helpers";

afterEach(async () => {
  await Promise.all(openStores.splice(0).map((s) => s.close()));
  // Fails the test that produced a response not matching openapi.yaml (#32).
  const found = violations.splice(0);
  if (found.length) throw new Error(`Responses must match openapi.yaml:\n${found.join("\n")}`);
});
