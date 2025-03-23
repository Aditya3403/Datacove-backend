import jwt from "jsonwebtoken";
import { User } from "../model/user.model.js";
import { Org } from "../model/org.model.js";
import { Client } from "../model/client.model.js";
import dotenv from "dotenv";

// Ensure dotenv is configured
dotenv.config();
console.log("Environment:", process.env.NODE_ENV);
console.log("JWT_SECRET available:", !!process.env.JWT_SECRET);
export const protectRoute = async (req, res, next) => {
  try {
    // Extract the token from the cookie
    const token = req.cookies["datacove-ai"];
    console.log("Token from cookie:", token);

    // Check if the token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
    }

    // Verify the token
    let decoded;
    try {
      // Use process.env directly
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);
    } catch (error) {
      console.error("Token verification error:", error.message);

      // Handle specific JWT errors
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - Token expired",
        });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - Invalid token",
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - Token verification failed",
        });
      }
    }

    // Check if the decoded token contains a valid userId
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token payload",
      });
    }

    // Find the user, org, or client associated with the userId
    const user = await User.findById(decoded.userId).select("-password");
    const org = await Org.findById(decoded.userId).select("-password");
    const client = await Client.findById(decoded.userId).select("-password");

    // If no account is found, return an error
    if (!user && !org && !client) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach the account (user, org, or client) to the request object
    const account = user || org || client;
    req.user = account;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};