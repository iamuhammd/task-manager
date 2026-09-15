import mongoose from 'mongoose';
import { MONGODB_URI } from './env';
import logger from '../utils/logger';

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    logger.error(`Error connecting to MongoDB: ${error.message}`, { error });
    process.exit(1);
  }
};

export default connectDB;
