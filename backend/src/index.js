/**
 * ReadLater Pro Backend
 * Main entry point for the API server
 */

// Import dependencies
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");

// Import logger
const logger = require("./utils/logger");

// Import routes
const articlesRoutes = require("./routes/articles");
const highlightsRoutes = require("./routes/highlights");
const notesRoutes = require("./routes/notes");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Configure middleware
app.use(helmet()); // Security headers
app.use(morgan("dev")); // Logging
app.use(express.json()); // Parse JSON bodies

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["chrome-extension://your-extension-id"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            if (allowedOrigins.indexOf(origin) === -1) {
                const msg =
                    "The CORS policy for this site does not allow access from the specified Origin.";
                return callback(new Error(msg), false);
            }

            return callback(null, true);
        },
        credentials: true,
    })
);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => logger.info("Connected to MongoDB"))
    .catch((err) => {
        logger.error("MongoDB connection error:", err);
        process.exit(1);
    });

// Health check route
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// API routes
app.use("/articles", ClerkExpressRequireAuth(), articlesRoutes);
app.use("/highlights", ClerkExpressRequireAuth(), highlightsRoutes);
app.use("/notes", ClerkExpressRequireAuth(), notesRoutes);

// Import error handler middleware
const errorHandler = require("./middleware/errorHandler");

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
