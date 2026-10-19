import { MemoryStore } from "../src/store/memory";
import { storeSuite } from "./store.suite";

storeSuite("MemoryStore", async () => new MemoryStore());
