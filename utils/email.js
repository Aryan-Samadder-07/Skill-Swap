import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendOtpEmail(toEmail, otpCode) {
  try {
    await transporter.sendMail({
      from: `SkillSwap <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: "Your OTP Code",
      html: `<p>Your OTP is <strong>${otpCode}</strong></p>`,
    });
    console.log("OTP email sent successfully");
  } catch (error) {
    console.error("Error sending OTP:", error);
  }
}
