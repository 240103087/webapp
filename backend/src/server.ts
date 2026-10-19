import { buildDeps, createApp } from "./app";

const deps = await buildDeps();
createApp(deps).listen(deps.config.port, () => {
  const { port, uploadDir, staticDir } = deps.config;
  console.log(`MoveEasy API on http://localhost:${port} (store: ${deps.store.kind}, uploads: ${uploadDir})`);
  if (staticDir) console.log(`Serving the app from ${staticDir}: open http://localhost:${port}`);
});
