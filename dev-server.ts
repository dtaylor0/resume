import { serve } from "@hono/node-server";
import app from "./src/server";

serve(app, (info) => {
  console.log(`Hono server is running on http://localhost:${info.port}`);
});
