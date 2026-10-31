
import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL ??
      "http://localhost:5173",
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Empty Miles Marketplace API is running",
    service: "empty-miles-backend",
    status: "healthy",
  });
});

// Authentication endpoints
app.use("/api/v1/auth", authRoutes);

// Unknown API routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Centralized error handler.
// Don't expose database errors or stack traces to clients.
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled API error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

export default app;
