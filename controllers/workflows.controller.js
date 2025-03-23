import { Workflow } from "../model/workflow.model.js";
export async function getWorkflows(req, res) {
  try {
    const workflows = await Workflow.find();
    res.status(200).json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
