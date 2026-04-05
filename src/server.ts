import "dotenv/config";
import { loadEnv } from "./config/env";
import { createApp } from "./app";

const env = loadEnv();
const app = createApp(() => env);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
