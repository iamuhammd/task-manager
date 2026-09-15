import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { PORT, NODE_ENV, CLIENT_URL } from './config/env';
import connectDB from './config/db';
import logger from './utils/logger';
import errorHandler from './middleware/errorHandler';
import rateLimiter from './middleware/rateLimiter';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';

const app: Express = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL || '*',
    credentials: true,
  })
);

// Rate Limiting
app.use(rateLimiter);

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger OpenAPI Setup
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Manager API',
      version: '1.0.0',
      description: 'Production-ready RESTful API for managing tasks, projects, and users',
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/v1`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Task Manager API service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes Mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);

// Global Error Handler Middleware (Must be mounted last)
app.use(errorHandler);

// Start Server when run directly
if (NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(`Swagger API Docs available at http://localhost:${PORT}/api-docs`);
    });
  });
}

export default app;
