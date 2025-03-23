import Stripe from "stripe";
import { User } from "../model/user.model.js";
import { Membership } from "../model/membership.model.js";

import dotenv from "dotenv";
import { ENV_VARS } from "../config/envVar.js";

dotenv.config();

function formatAmount(amount) {
  if (!amount) return "Invalid Amount"; // Handle undefined/null cases

  const formattedAmount = (Number(amount) / 100).toFixed(2); // Convert cents to dollars
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CAD", // Use uppercase currency code
  }).format(formattedAmount);
}

function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // 24-hour format
  });
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to map plan features
const getPlanFeatures = (planName) => {
  switch (planName) {
    case "Basic (Free Trial)":
      return {
        domainAgents: 1,
        documentUploadsPerMonth: 100,
        isUnlimitedUploads: false,
        isUnlimitedAgents: false,
        hasAdvancedReporting: false,
        hasAPIAccess: false,
        hasDedicatedSupport: false,
      };
    case "Business":
      return {
        domainAgents: 3,
        documentUploadsPerMonth: 1000,
        isUnlimitedUploads: false,
        isUnlimitedAgents: false,
        hasAdvancedReporting: true,
        hasAPIAccess: false,
        hasDedicatedSupport: false,
      };
    case "Enterprise":
      return {
        domainAgents: 10,
        documentUploadsPerMonth: 10000,
        isUnlimitedUploads: true,
        isUnlimitedAgents: true,
        hasAdvancedReporting: true,
        hasAPIAccess: true,
        hasDedicatedSupport: true,
      };
    default:
      return {
        domainAgents: 1,
        documentUploadsPerMonth: 100,
        isUnlimitedUploads: false,
        isUnlimitedAgents: false,
        hasAdvancedReporting: false,
        hasAPIAccess: false,
        hasDedicatedSupport: false,
      };
  }
};

// Create a checkout session for buying the membership for first time
export const createCheckoutSession = async (req, res) => {
  const { userId, planId, planName, amount, action = "new" } = req.body;
  console.log("plan name", planName);

  if (!userId || !planId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const user = await User.findById(userId).populate("membership");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user already has a subscription and wants to manage it
    if (user.membership && action === "manage") {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.membership.customerId,
        return_url: `${process.env.FRONTEND_URL}/dashboard`,
      });
      console.log("Portal session", portalSession);
      return res.json({ billingUrl: portalSession.url });
    }

    // Create or update checkout session
    let sessionData = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: planId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        planName: planName,
        amount: amount,
        email: user.email,
      },
    };

    console.log("sessionData:", sessionData);

    // If user has an email, use it for customer info
    if (user.email) {
      sessionData.customer_email = user.email;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionData);

    return res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Create a checkout session for upgrading the current plan
export const currentPlan = async (req, res) => {
  const { userId, newPlanId } = req.body;

  console.log("New plan id", newPlanId);

  if (!userId || !newPlanId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const user = await User.findById(userId).populate("membership");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has an existing subscription
    if (!user.membership) {
      return res
        .status(400)
        .json({ message: "User does not have a subscription to upgrade" });
    }

    // Create a new checkout session for upgrading the subscription
    let session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: newPlanId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_from_plan: false,
      },
      success_url: `${process.env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        oldPlanId: user.membership.planId,
        newPlanId: newPlanId,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating upgrade session:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Handle the webhook from Stripe
// export const handleStripeWebhook = async (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   let event;
//   console.log("Sig : ", sig);
//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       ENV_VARS.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     console.error(`Webhook Error: ${err.message}`);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the event
//   switch (event.type) {
//     case "checkout.session.completed":
//       const session = event.data.object;
//       await handleCheckoutSessionCompleted(session);
//       break;
//     case "customer.subscription.created":
//       const newSubscription = event.data.object;
//       await handleNewSubscription(newSubscription);
//       break;
//     case "customer.subscription.updated":
//       const subscription = event.data.object;
//       await handleSubscriptionUpdated(subscription);
//       break;
//     case "customer.subscription.deleted":
//       const canceledSubscription = event.data.object;
//       await handleSubscriptionCanceled(canceledSubscription);
//       break;
//     case "invoice.payment_succeeded":
//       const invoice = event.data.object;
//       await handleInvoicePaymentSucceeded(invoice);
//       break;
//     case "invoice.payment_failed":
//       const failedInvoice = event.data.object;
//       await handleInvoicePaymentFailed(failedInvoice);
//       break;
//     default:
//       console.log(`Unhandled event type: ${event.type}`);
//   }

//   res.json({ received: true });
// };

// Handle checkout session completed
const handleCheckoutSessionCompleted = async (session) => {
  console.log("SESSION------------------------------updated", session);

  const userId = session.client_reference_id;
  const planName = session.metadata.planName;
  const subscriptionId = session.subscription;
  const customerId = session.customer;
  const planAmount = session.metadata.amount;

  try {
    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Get plan features
    const planFeatures = getPlanFeatures(planName);

    // Create or update membership
    const membershipData = {
      userId: userId,
      planId: subscription.items.data[0].price.id,
      planName: planName,
      customerId: customerId,
      subscriptionId: subscriptionId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      features: planFeatures,
      amount: planAmount,
    };

    const user = await User.findById(userId);

    // Check if user already has a membership
    if (user.membership) {
      await Membership.findByIdAndUpdate(user.membership, membershipData);
    } else {
      // Create new membership and update user
      const newMembership = new Membership(membershipData);
      await newMembership.save();

      // Update user with membership reference
      await User.findByIdAndUpdate(userId, { membership: newMembership._id });
    }
  } catch (error) {
    console.error("Error handling checkout completion:", error);
  }
};

//Handle new subscription created
const handleNewSubscription = async (subscription) => {
  console.log("NEW SUBSCRIPTION--------:", subscription);

  // try {
  //   const newMembership = new Membership({
  //     userId: /* Fetch user ID based on customer ID */,
  //     planId: subscription.plan.id,
  //     planName: /* Fetch plan name from DB if needed */,
  //     customerId: subscription.customer,
  //     subscriptionId: subscription.id,
  //     status: subscription.status,
  //     currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
  //     amount: subscription.plan.amount.toString(),
  //     createdAt: new Date(subscription.created * 1000), // Store the actual start date
  //     features: {
  //       domainAgents: 5, // Customize based on the plan
  //       documentUploadsPerMonth: 10,
  //       isUnlimitedUploads: false,
  //       isUnlimitedAgents: false,
  //       hasAdvancedReporting: false,
  //       hasAPIAccess: false,
  //       hasDedicatedSupport: false,
  //     },
  //   });

  //   await newMembership.save();
  // } catch (error) {
  //   console.error("Error handling new subscription:", error);
  // }
};

// Handle subscription updated
const handleSubscriptionUpdated = async (subscription) => {
  console.log("SUBSCRIPTION------------", subscription);
  try {
    // Find membership by subscription ID
    const membership = await Membership.findOne({
      subscriptionId: subscription.id,
    });

    if (membership) {
      // Update subscription details
      membership.status = subscription.status;
      membership.currentPeriodStart = new Date(
        subscription.current_period_start * 1000
      );
      membership.currentPeriodEnd = new Date(
        subscription.current_period_end * 1000
      );
      membership.cancelAtPeriodEnd = subscription.cancel_at_period_end;

      await membership.save();
    }
  } catch (error) {
    console.error("Error handling subscription update:", error);
  }
};

// Handle subscription canceled
const handleSubscriptionCanceled = async (subscription) => {
  try {
    // Find and update membership
    await Membership.findOneAndUpdate(
      { subscriptionId: subscription.id },
      { status: "canceled" }
    );
  } catch (error) {
    console.error("Error handling subscription cancellation:", error);
  }
};

// Handle successful invoice payment
const handleInvoicePaymentSucceeded = async (invoice) => {
  if (invoice.subscription) {
    try {
      // Update membership with new period dates
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription
      );

      await Membership.findOneAndUpdate(
        { subscriptionId: invoice.subscription },
        {
          status: subscription.status,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      );
    } catch (error) {
      console.error("Error handling invoice payment success:", error);
    }
  }
};

// Handle failed invoice payment
const handleInvoicePaymentFailed = async (invoice) => {
  if (invoice.subscription) {
    try {
      // Update membership status
      await Membership.findOneAndUpdate(
        { subscriptionId: invoice.subscription },
        { status: "past_due" }
      );
    } catch (error) {
      console.error("Error handling invoice payment failure:", error);
    }
  }
};

// Get current subscription
export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming auth middleware sets req.user

    const user = await User.findById(userId).populate("membership");

    if (!user || !user.membership) {
      return res.json({ subscription: null });
    }

    // Get fresh subscription data from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      user.membership.subscriptionId
    );

    // Update local subscription if needed
    if (
      user.membership.status !== stripeSubscription.status ||
      user.membership.cancelAtPeriodEnd !==
        stripeSubscription.cancel_at_period_end
    ) {
      await Membership.findByIdAndUpdate(user.membership._id, {
        status: stripeSubscription.status,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ),
      });

      // Re-fetch updated membership
      const updatedUser = await User.findById(userId).populate("membership");
      return res.json({ subscription: updatedUser.membership });
    }

    return res.json({ subscription: user.membership });
  } catch (error) {
    console.error("Error fetching current subscription:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Handle subscription success page
export const handleSubscriptionSuccess = async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ message: "Missing session ID" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const userId = session.client_reference_id;

    // Find user and populate membership
    const user = await User.findById(userId).populate("membership");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      subscription: user.membership,
      message: "Subscription successfully activated!",
    });
  } catch (error) {
    console.error("Error handling subscription success:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getSessionDetails = async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ message: "Missing session ID" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Fetching Membership Details

export const getMembershipDetails = async (req, res) => {
  try {
    const membershipId = req.user.membership; // Extract membership ID from user

    if (!membershipId) {
      return res.status(400).json({
        success: false,
        message: "Membership ID not found in user object",
      });
    }

    const membership = await Membership.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    res.status(200).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    console.error("Error fetching membership: ", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// import stripe from "../stripeConfig.js";
// import { User } from "../model/user.model.js";
// import { Membership } from "../model/membership.model.js";

// export const createMembership = async (userId, planId, paymentMethodId) => {
//   try {
//     const user = await User.findById(userId);
//     if (!user) {
//       throw new Error("User not found");
//     }

//     // Create Stripe customer if not already created
//     if (!user.membership.stripeCustomerId) {
//       const customer = await stripe.customers.create({
//         email: user.email,
//         name: user.name,
//         payment_method: paymentMethodId,
//         invoice_settings: {
//           default_payment_method: paymentMethodId,
//         },
//       });

//       user.membership.stripeCustomerId = customer.id;
//     }

//     // Create Stripe subscription
//     const subscription = await stripe.subscriptions.create({
//       customer: user.membership.stripeCustomerId,
//       items: [{ plan: planId }],
//       expand: ["latest_invoice.payment_intent"],
//     });

//     // Update user membership details
//     user.membership = {
//       plan: planId,
//       status: subscription.status,
//       startDate: new Date(subscription.current_period_start * 1000),
//       endDate: new Date(subscription.current_period_end * 1000),
//       stripeCustomerId: user.membership.stripeCustomerId,
//       stripeSubscriptionId: subscription.id,
//     };

//     await user.save();

//     return subscription;
//   } catch (error) {
//     console.error("Error creating membership:", error);
//     throw error;
//   }
// };

// // export const createCheckoutSession = async (req, res) => {
// //   const { userId, planId } = req.body;
// //   console.log("user id from checkout session", userId);
// //   console.log("plan id from checkout session", planId);

// //   try {
// //     const user = await User.findById(userId).populate("membership");
// //     if (!user) {
// //       return res.status(404).json({ error: "User not found" });
// //     }

// //     let customerId = user.membership?.stripeCustomerId;
// //     console.log("customer ID", customerId);

// //     // If no Stripe Customer exists, create one
// //     if (!customerId) {
// //       const customer = await stripe.customers.create({
// //         email: user.email,
// //         name: user.name,
// //       });
// //       customerId = customer.id;
// //     }

// //     console.log("After creating customer id", customerId);

// //     // **Step 1: Create Stripe Subscription**
// //     const subscription = await stripe.subscriptions.create({
// //       customer: customerId,
// //       items: [{ price: planId }],
// //       payment_behavior: "default_incomplete",
// //       expand: ["latest_invoice.payment_intent"],
// //     });

// //     console.log("subscription", subscription);

// //     // **Step 2: Create or Update Membership Record**
// //     let membership = user.membership;
// //     if (!membership) {
// //       membership = new Membership({
// //         plan: planId,
// //         status: "active",
// //         stripeCustomerId: customerId,
// //         stripeSubscriptionId: subscription.id, // Fix: Store subscription ID
// //         startDate: new Date(),
// //         endDate: new Date(), // You may update this after handling webhooks
// //       });
// //     } else {
// //       membership.stripeSubscriptionId = subscription.id; // Update existing membership
// //     }

// //     await membership.save();
// //     user.membership = membership._id;
// //     await user.save();

// //     // **Step 3: Create Checkout Session**
// //     const session = await stripe.checkout.sessions.create({
// //       payment_method_types: ["card"],
// //       customer: customerId,
// //       subscription_data: { subscription: subscription.id },
// //       line_items: [{ price: planId, quantity: 1 }],
// //       mode: "subscription",
// //       success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
// //       cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// //     });

// //     res.status(200).json({ sessionId: session.id });
// //   } catch (error) {
// //     console.error("Error creating Checkout session:", error);
// //     res.status(500).json({ error: error.message });
// //   }
// // };

// export const createCheckoutSession = async (req, res) => {
//   try {
//     const { planId } = req.body; // No need to get userId from request body
//     const user = req.user; // Extract authenticated user from middleware

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     let customerId = user.membership?.stripeCustomerId;
//     console.log("customerId", customerId);

//     // If customer ID is not stored locally, check in Stripe
//     if (!customerId) {
//       const customers = await stripe.customers.list({
//         email: user.email,
//         limit: 1,
//       });

//       if (customers.data.length > 0) {
//         customerId = customers.data[0].id;
//       } else {
//         // Create a new customer in Stripe
//         const customer = await stripe.customers.create({
//           email: user.email,
//           name: user.name,
//         });
//         customerId = customer.id;
//       }
//     }

//     // Check if the customer already has an active subscription
//     const subscriptions = await stripe.subscriptions.list({
//       customer: customerId,
//       status: "active",
//       limit: 1,
//     });

//     if (subscriptions.data.length > 0) {
//       console.log(
//         "User already has an active subscription. Redirecting to billing portal."
//       );

//       // Redirect to billing portal instead of checkout
//       const portalSession = await stripe.billingPortal.sessions.create({
//         customer: customerId,
//         return_url: process.env.FRONTEND_URL,
//       });

//       return res.status(200).json({ billingUrl: portalSession.url });
//     }

//     // Create a new checkout session if no active subscription
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       customer: customerId,
//       line_items: [{ price: planId, quantity: 1 }],
//       mode: "subscription",
//       success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.FRONTEND_URL}/cancel`,
//     });

//     res.status(200).json({ sessionId: session.id });
//   } catch (error) {
//     console.error("Error creating Checkout session:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// export const webhook = async (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       ENV_VARS.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     console.error("Webhook Error:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle successful payment event
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;
//     const customerId = session.customer;
//     const planId = session.line_items?.data[0]?.price?.id;

//     try {
//       const user = await User.findOne({
//         "membership.stripeCustomerId": customerId,
//       });

//       if (!user) {
//         console.error("User not found for customer ID:", customerId);
//         return res.status(400).json({ error: "User not found" });
//       }

//       // Create a new membership
//       const membership = new Membership({
//         plan: planId,
//         status: "active",
//         stripeCustomerId: customerId,
//         stripeSubscriptionId: session.subscription,
//         startDate: new Date(),
//         endDate: new Date(), // Set actual end date based on subscription
//       });

//       await membership.save();
//       user.membership = membership._id;
//       await user.save();

//       console.log("Membership created for user:", user.id);
//       res.status(200).json({ message: "Membership created" });
//     } catch (error) {
//       console.error("Error creating membership:", error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   res.sendStatus(200);
// };

export const createMembership = async (req, res) => {
  const {
    userId,
    planId,
    planName,
    customerId,
    subscriptionId,
    amount,
    features,
  } = req.body;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const newMembership = new Membership({
      userId,
      planId,
      planName,
      customerId,
      subscriptionId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      features,
      amount,
    });

    await newMembership.save();

    res.status(201).json(newMembership);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCheckoutSession = async (req, res) => {
  const { session_id } = req.query;
  console.log("Session Id", session_id);
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    res.status(200).json({
      customerId: session.customer,
      subscriptionId: session.subscription,
      amount: subscription.plan.amount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPaymentLink = async (req, res) => {
  const { userId, planId, planName, features } = req.body;
  console.log("userId", userId);
  console.log("planId", planId);
  console.log("PlanName", planName);
  console.log("Features", features);

  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: planId, // Replace with actual Stripe Price ID
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        planId,
        planName,
        features,
      },
    });

    res.json({ url: paymentLink.url });
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
};
