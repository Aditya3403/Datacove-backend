// import express from "express";
// import {
//   createCheckoutSession,
//   createMembership,
//   webhook,
// } from "../controllers/membership.controller.js";

// import { protectRoute } from "../middleware/protectRoute.js";
// const router = express.Router();

// router.post("/create-membership", async (req, res) => {
//   const { userId, planId, paymentMethodId } = req.body;

//   try {
//     const subscription = await createMembership(
//       userId,
//       planId,
//       paymentMethodId
//     );
//     res.status(200).json({ subscription });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// router.post("/create-checkout-session", protectRoute, createCheckoutSession);
// router.post("/webhook", express.raw({ type: "application/json" }), webhook);

// export default router;

// Step 4: Set up routes
// membershipRoutes.js
import express from "express";

import { protectRoute } from "../middleware/protectRoute.js";
import {
  createCheckoutSession,
  currentPlan,
  getCurrentSubscription,
  getMembershipDetails,
  getSessionDetails,
  // handleStripeWebhook,
  handleSubscriptionSuccess,
} from "../controllers/membership.controller.js";
import { createMembership } from "../controllers/membership.controller.js";
import { createPaymentLink } from "../controllers/membership.controller.js";
import { getCheckoutSession } from "../controllers/membership.controller.js";
import { Membership } from "../model/membership.model.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Protected routes (require authentication)
router.post("/create-checkout-session", protectRoute, createCheckoutSession);
router.get("/current-subscription", protectRoute, getCurrentSubscription);
router.get("/subscription-success", protectRoute, handleSubscriptionSuccess);
router.get("/get-session-details", getSessionDetails);
router.get("/get-membership", protectRoute, getMembershipDetails);
router.post("/upgrade-current-plant", currentPlan);
router.post("/create", createMembership);
router.post("/create-payment-link", createPaymentLink);
router.get("/checkout-session", getCheckoutSession);

// Webhook doesn't need auth - it's called by Stripe
// router.post("/webhook", handleStripeWebhook);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("inside webhook");
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("Payment successful, session details:", session);

      try {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        // Save membership to database
        const newMembership = new Membership({
          userId: session.metadata.userId, // You need to pass userId from frontend when creating the payment link
          planId: session.metadata.planId, // Same for planId
          planName: session.metadata.planName,
          customerId: session.customer,
          subscriptionId: session.subscription,
          status: subscription.status,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          // features: JSON.parse(session.metadata.features || "[]")
          amount: subscription.plan.amount,
        });

        await newMembership.save();
        console.log("Membership saved:", newMembership);
      } catch (err) {
        console.error("Error saving membership:", err.message);
        return res.status(500).json({ message: err.message });
      }
    }

    res.status(200).json({ received: true });
  }
);

export default router;
