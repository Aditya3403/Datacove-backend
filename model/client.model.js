import mongoose from "mongoose";

const clientSchema = mongoose.Schema(
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
    password: {
      type: String,
      required: true,
    },
    inviterId: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      required: true,
    },
    userS3Bucket: {
      type: String,
      required: true,
    },

    sharedDocs: [
      {
        docId: { type: String, ref: "Document" },
        sharedByEmail: { type: String, ref: "User" },
        sharedAt: { type: Date, default: Date.now },
        sharedByName: { type: String, ref: "User" },
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
      },
    ],

    is_email_verified: { type: Boolean, default: false },
    notes: [
      {
        title: String,
        content: String,
        date: { type: Date, default: Date.now },
      },
    ],
    docs: [],
  },
  {
    timestamps: true,
  }
);

export const Client = mongoose.model("Client", clientSchema);
