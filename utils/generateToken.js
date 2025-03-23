import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Ensure dotenv is configured
dotenv.config();
const jwtSecret = process.env.JWT_SECRET;
console.log("JWT_SECRET available in token generator:", !!jwtSecret);
//Dev
export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });

  res.cookie("datacove-ai", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, //15 days in MS
    httpOnly: true, // Prevent XSS attacks, make it not accessible by JS
    sameSite: "Strict", // Allow the cookie to be sent in cross-origin requests
    secure: false,
  });
  return token;
};

// Production

// export const generateTokenAndSetCookie = (userId, res) => {
//   const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });
//
//   res.cookie("datacove-ai", token, {
//     maxAge: 15 * 24 * 60 * 60 * 1000, //15 days in MS
//     httpOnly: true, // Prevent XSS attacks, make it not accessible by JS
//     sameSite: "None", // Allow the cookie to be sent in cross-origin requests
//     secure: true,
//   });
//   return token;
// };