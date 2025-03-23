import mongoose, { mongo } from "mongoose";

const orgSchema = mongoose.Schema(
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
    organizationName: {
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
    sharedDocs: [],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    invitations: [],
    clients: [],
  },
  {
    timestamps: true,
  }
);

export const Org = mongoose.model("Org", orgSchema);
