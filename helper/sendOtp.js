import sgMail from "@sendgrid/mail";
import { ENV_VARS } from "../config/envVar.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOTP = async (email, otp) => {
  const verificationLink = `http://localhost:5173/verify-email?email=${email}&otp=${otp}`;
  const msg = {
    to: email,
    from: ENV_VARS.SENDGRID_EMAIL, // Your verified sender email
    subject: "Verify Your Email - OTP Code",
    text: `Your OTP code is ${otp}. It is valid for 10 minutes. Click the link below to verify your email: ${verificationLink}`,
    html: `
      <p>Your OTP code is <strong>${otp}</strong>. It is valid for 10 minutes.</p>
      <p>Click the link below to verify your email:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 10px 15px; color: #fff; background-color: #7367F0; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>If the button doesn't work, you can also use this link: <br> <a href="${verificationLink}">${verificationLink}</a></p>
    `,
  };
  await sgMail.send(msg);
};

export default sendOTP;
