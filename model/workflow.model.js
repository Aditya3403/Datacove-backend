import mongoose from "mongoose";

const workflowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  subcategory: { type: String },
  industry: { type: String },
  icon: { type: String },
  status: { type: String },
  isPublic: { type: Boolean },
  isCustomizable: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  lastUsed: { type: Date },
  totalDocumentsProcessed: { type: Number, default: 0 },
  averageProcessingTime: { type: Number, default: 0 },
  successRate: { type: Number, default: 100 },
  requiredInputs: [
    {
      name: { type: String, required: true },
      description: { type: String },
      type: { type: String, required: true },
      isRequired: { type: Boolean, required: true },
      maxCount: { type: Number, default: 1 }, // Default value to prevent validation issues
    },
  ],
  analysisModules: [{ type: String }],
  avgUserRating: { type: Number, default: 0 },
  totalUserRatings: { type: Number, default: 0 },
  permissions: {
    roles: [{ type: String }],
    featureAccess: { type: String },
  },
  integrations: [{ type: String }],
  tags: [{ type: String }],
});

export const Workflow = mongoose.model("Workflow", workflowSchema);
