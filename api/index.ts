import serverless from "serverless-http";
import { app } from "../src/app.js";

// راوترة واحدة لكل طلبات `api/*` في Vercel.
export default serverless(app);
