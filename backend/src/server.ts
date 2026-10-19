import { createApp } from "./app";

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.log(`API on http://localhost:${port}`);
});
