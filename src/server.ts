import "dotenv/config";
import { loadEnv } from "./config/env";
import { createApp } from "./app";

const env = loadEnv();
const app = createApp(() => env);

const PORT = Number(process.env.PORT) || env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
