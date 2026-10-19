import { createMockApi } from "./mock/mockApi";
import type { Api } from "./types";

/** The one services object every screen uses. `VITE_API=mock` (default until #36) or `http`. */
export const api: Api = createMockApi({ latency: import.meta.env.MODE === "test" ? [0, 0] : [150, 400] });
export { ApiError } from "./types";
export type { Api } from "./types";
export { MOCK_PERSIST_MAX_BYTES } from "./mock/mockApi";
