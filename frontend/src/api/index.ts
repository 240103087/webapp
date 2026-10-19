import { createHttpApi } from "./http/httpApi";
import { createMockApi } from "./mock/mockApi";
import type { Api } from "./types";

/**
 * The one services object every screen uses (#36).
 * `VITE_API=http` (default): the backend through `/api`. `VITE_API=mock`: everything in the browser.
 * Component tests always use the mock.
 */
const mode = import.meta.env.MODE === "test" ? "mock" : import.meta.env.VITE_API === "mock" ? "mock" : "http";
export const api: Api = mode === "mock" ? createMockApi({ latency: import.meta.env.MODE === "test" ? [0, 0] : [150, 400] }) : createHttpApi();
export { ApiError } from "./types";
export type { Api } from "./types";
export { MOCK_PERSIST_MAX_BYTES } from "./mock/mockApi";
