import Stripe from "stripe";
import { ENV_VARS } from "./config/envVar.js";

const stripe = new Stripe(`${ENV_VARS.STRIPE_SECRET_KEY}`, {
  apiVersion: "2022-11-15",
});

export default stripe;
