import { describe, it, expect } from "vitest";
import request from "supertest";
import { testApp } from "./helpers";

describe("auth API (#25)", () => {
  it("signs up, reads me, logs out, and the token stops working", async () => {
    const { app, deps } = await testApp();
    const res = await request(app).post("/api/auth/signup").send({ name: " Test ", email: "Test@Example.com", password: "password1" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Test", email: "test@example.com" });
    expect(res.body.token).toMatch(/^[\w-]{40,}$/);
    const auth = { Authorization: `Bearer ${res.body.token}` };
    const me = await request(app).get("/api/auth/me").set(auth);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("test@example.com");
    const stored = await deps.store.getUserByEmail("test@example.com");
    expect(stored!.passwordHash).not.toContain("password1");
    expect((await request(app).post("/api/auth/logout").set(auth)).status).toBe(204);
    const after = await request(app).get("/api/auth/me").set(auth);
    expect(after.status).toBe(401);
    expect(after.body.code).toBe("unauthorized");
  });

  it("logs in the seed user; wrong password and unknown email give the same 401", async () => {
    const { app } = await testApp();
    const ok = await request(app).post("/api/auth/login").send({ email: "aigerim@example.com", password: "password123" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.name).toBe("Aigerim Sadykova");
    const wrong = await request(app).post("/api/auth/login").send({ email: "aigerim@example.com", password: "nope-nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "nope-nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe("bad_credentials");
  });

  it("409 for a taken email, 422 with fields for bad input, 401 without a token", async () => {
    const { app } = await testApp();
    const taken = await request(app).post("/api/auth/signup").send({ name: "A", email: "AIGERIM@example.com", password: "password1" });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: "email_taken", fields: { email: "An account with this email already exists" } });
    const bad = await request(app).post("/api/auth/signup").send({ name: "", email: "x", password: "short" });
    expect(bad.status).toBe(422);
    expect(bad.body.code).toBe("validation");
    expect(bad.body.fields).toMatchObject({ name: "Name is required", email: "Enter a valid email address", password: "Password must be at least 8 characters" });
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer made-up")).status).toBe(401);
    expect((await request(app).post("/api/auth/logout")).status).toBe(401);
  });
});
