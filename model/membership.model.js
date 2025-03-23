import mongoose from "mongoose";

const membershipSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    subscriptionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "trialing",
        "incomplete",
      ],
      default: "active",
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    // Track subscription features based on plan
    // features: {
    //   domainAgents: {
    //     type: Number,
    //     required: true,
    //   },
    //   documentUploadsPerMonth: {
    //     type: Number,
    //     required: true,
    //   },
    //   isUnlimitedUploads: {
    //     type: Boolean,
    //     default: false,
    //   },
    //   isUnlimitedAgents: {
    //     type: Boolean,
    //     default: false,
    //   },
    //   hasAdvancedReporting: {
    //     type: Boolean,
    //     default: false,
    //   },
    //   hasAPIAccess: {
    //     type: Boolean,
    //     default: false,
    //   },
    //   hasDedicatedSupport: {
    //     type: Boolean,
    //     default: false,
    //   },
    // },
    amount: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Membership = mongoose.model("Membership", membershipSchema);
