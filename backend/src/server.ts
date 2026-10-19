import { buildDeps, createApp } from "./app";

const deps = await buildDeps();
createApp(deps).listen(deps.config.port, () => {
  console.log(`MoveEasy API on http://localhost:${deps.config.port} (store: ${deps.store.kind}, uploads: ${deps.config.uploadDir})`);
});
