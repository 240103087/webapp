import { createApp, defaultDeps } from "./app";

const deps = defaultDeps();
createApp(deps).listen(deps.config.port, () => {
  console.log(`MoveEasy API on http://localhost:${deps.config.port} (store: ${deps.config.store})`);
});
