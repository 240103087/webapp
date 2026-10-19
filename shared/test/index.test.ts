import { describe, it, expect } from "vitest";
import { APP_NAME } from "../src/index";
describe("shared", () => { it("exports the app name", () => { expect(APP_NAME).toBe("MoveEasy Memory Tags"); }); });
