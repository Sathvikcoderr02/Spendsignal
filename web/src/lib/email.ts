import { Resend } from "resend";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

type SendEmailResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey || !resendFromEmail) {
      return { success: false, error: "Email provider is not configured." };
    }

    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: resendFromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      console.error("Resend API error:", result.error.message);
      return { success: false, error: result.error.message };
    }

    console.log("Email sent successfully");
    return { success: true, data: result.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email exception.";
    console.error("Email send exception:", message);
    return { success: false, error: message };
  }
}
