import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import saveWorkflows from "./helper/saveWorkFlow.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB(); // Connect to MongoDB
    await saveWorkflows(); // Save workflows
    console.log("Done.");
    process.exit(0); // Exit the process successfully
  } catch (error) {
    console.error("Error running script:", error);
    process.exit(1); // Exit with failure
  }
};

run();
