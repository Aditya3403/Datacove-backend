import mongoose from "mongoose";
import { ENV_VARS } from "./envVar.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV_VARS.MONGO_URI);
    // console.log("connecting");
    console.log("MongoDB connected: " + conn.connection.host);
  } catch (error) {
    console.error("Error connecting to mongoDb: " + error.message);
    process.exit(1); //1 means there was an error
  }
};
