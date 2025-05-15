require("./config/otelConfig");
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { RedisService } from "ondc-automation-cache-lib";
import { checkRedisHealth, JsonResponseToText } from "./config/redis";
import reportRouter from "./routes/reportRoute";
import { logError, logger, logInfo } from "./utils/logger";

// Initialize dotenv to load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set up Redis database connection
try {
  RedisService.useDb(2);
} catch (err) {
  logger.error(err);
}

// Middleware setup
app.use(express.json());

// Routes
app.use("/", reportRouter);

// Global error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // logger.error(err.stack);
  logError({
    message: "Internal Server Error",
    error: err,
  });
  res.status(500).send("Something went wrong!");
});

// Health check route
app.get("/redis-health", async (req: Request, res: Response) => {
  const redisHealthy = await checkRedisHealth();
  // response object
  const redisResponse = {
    name: "Redis",
    status: redisHealthy ? "up" : "down",
    timestamp: new Date().toISOString(),
  };
  const response = JsonResponseToText(redisResponse);

  if (redisHealthy) {
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(response);
  } else {
    res.status(500).send(response);
  }
});

// process.on("SIGINT", async () => {
//   console.log("\nShutting down...");
//   await disconnectRedis();
//   process.exit();
// });

// Start the server
app.listen(PORT, () => {
  // logger.info(`Server is running on http://localhost:${PORT}`);
  logInfo({
    message: `Server is running on http://localhost:${PORT}`,
  });
});
