import workflows from "../workflows.js";
import { Workflow } from "../model/workflow.model.js";

const saveWorkflows = async () => {
  try {
    const existingWorkflow = await Workflow.findOne({
      id: "wf-legal-001",
    });

    if (existingWorkflow) {
      console.log("Workflows already exist. Skipping insertion.");
    } else {
      await Workflow.insertMany(workflows);
      console.log("Workflows saved successfully!");
    }
  } catch (error) {
    console.error("Error saving workflows:", error);
  }
};

export default saveWorkflows;
