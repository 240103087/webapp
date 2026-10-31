import { execFileSync } from "node:child_process";
import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Integration test against the Docker Compose stack (#73): the image serves the built frontend,
 * the app talks to Postgres, and the data survives a restart of the app container.
 * Runs only with E2E_STACK=1 (`npm run test:stack`), which starts the stack first.
 */
const DEMO = { email: "aigerim@example.com", password: "password123" };

async function waitHealthy(request: APIRequestContext) {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await request.get("/api/health")).ok()) return;
    } catch {
      /* the app is restarting */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("the app did not come back after the restart");
}

test("the built frontend is served", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("<title>MoveEasy Memory Tags</title>");
  // A client-side route falls back to the app, not to a 404
  expect((await request.get("/login")).status()).toBe(200);
});

test("a tag created through the API is still there after the app container restarts", async ({ request }) => {
  test.setTimeout(180_000);
  expect((await request.get("/api/health")).status()).toBe(200);

  const login = await request.post("/api/auth/login", { data: DEMO });
  expect(login.status()).toBe(200);
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };

  const title = `Stack check ${Date.now()}`;
  const created = await request.post("/api/tags", { headers, data: { kind: "gift", title, message: "Kept in Postgres" } });
  expect(created.status()).toBe(201);
  const tag = await created.json();

  execFileSync("docker", ["compose", "restart", "app"], { stdio: "inherit" });
  await waitHealthy(request);

  const again = await request.get(`/api/tags/${tag.id}`, { headers });
  expect(again.status()).toBe(200);
  expect((await again.json()).title).toBe(title);
  // And a visitor can open it by its code
  const pub = await request.get(`/api/public/tags/${tag.code}`);
  expect(pub.status()).toBe(200);
});
