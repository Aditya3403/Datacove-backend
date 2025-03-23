import mongoose, { mongo } from "mongoose";

const workflowSchema = new mongoose.Schema(
  {
    workflow_name: { type: String, required: true }, // Name of the workflow (e.g., "legal")
    prompt: { type: String, required: true }, // Prompt related to the workflow
    documents: [
      {
        title: { type: String, required: true }, // Document title
        description: { type: String, required: true }, // Document description
        s3_path: { type: String, required: true }, // S3 path of the document
      },
    ],
    analysisOptions: { type: [String], required: true }, // Analysis options (e.g., "sentiment", "entity")
  },
  { timestamps: true }
);

const userSchema = mongoose.Schema(
  {
    userType: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    s3Bucket: {
      type: String,
      default: null, // Stores the S3 bucket name
    },

    is_email_verified: { type: Boolean, default: false },
    is_client_also: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    notes: [
      {
        title: String,
        content: String,
        date: { type: Date, default: Date.now },
      },
    ],
    docs: [],
    workflows: [workflowSchema],

    sharedDocs: [],

    invitations: [],
    clients: [
      {
        inviterId: { type: String, required: true }, // Who invited them
        name: { type: String, required: true },
        email: { type: String, required: true },
        folder: { type: String, required: true },
        userS3Bucket: { type: String, required: true },
      },
    ],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    membership: { type: mongoose.Schema.Types.ObjectId, ref: "Membership" },

    folders: [
      {
        name: { type: String, required: true },
        displayName: { type: String, required: true },
        files: [
          {
            title: { type: String, required: true }, // Document title
            description: { type: String, required: true }, // Document description
            s3_path: { type: String, required: true }, // S3 path of the document
            uploadedAt: { type: Date, default: Date.now }, // Timestamp of upload
          },
        ],
        // accessType: { type: String, enum: ["private", "public"], default: "private" }
      },
    ],
    invitationsReceived: [
      {
        inviterId: { type: String, required: true }, // Who sent the invitation
        inviterName: { type: String, required: true }, // Name of the inviter
        inviterEmail: { type: String, required: true }, // Email of the inviter
        status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" }, // Status of the invitation
        token: { type: String, required: true }, // Unique token for the invitation
        createdAt: { type: Date, default: Date.now }, // Timestamp of the invitation
      },
    ],
  },

  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);
