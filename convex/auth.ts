import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";

const ResendOTP = Email({
  id: "resend-otp",
  maxAge: 60 * 60,
  sendVerificationRequest: async ({ identifier: email, token }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sports Card Scanner <noreply@resend.dev>",
        to: [email],
        subject: "Password Reset Code",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2>Reset your password</h2>
            <p>Use the code below to reset your Sports Card Scanner password.
               It expires in 1 hour.</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;
                        margin:24px 0;text-align:center">${token}</div>
            <p style="color:#888">If you didn't request this, ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to send password reset email: ${body}`);
    }
  },
});

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          ...(params.name ? { name: params.name as string } : {}),
        };
      },
      reset: ResendOTP,
    }),
  ],
});
