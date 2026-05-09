type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

type SendEmailResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

async function sendWithPostmark(params: SendEmailParams): Promise<SendEmailResult> {
  const postmarkServerToken = process.env.POSTMARK_SERVER_TOKEN;
  const postmarkFromEmail = process.env.POSTMARK_FROM_EMAIL;
  if (!postmarkServerToken || !postmarkFromEmail) {
    return { success: false, error: "Postmark provider is not configured." };
  }

  const recipients = Array.isArray(params.to) ? params.to.join(",") : params.to;
  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkServerToken,
      },
      body: JSON.stringify({
        From: postmarkFromEmail,
        To: recipients,
        Subject: params.subject,
        HtmlBody: params.html,
        MessageStream: "outbound",
      }),
    });

    const payloadText = await response.text();
    if (!response.ok) {
      return { success: false, error: `Postmark API error (${response.status}): ${payloadText}` };
    }

    console.log("Email sent successfully via Postmark");
    return { success: true, data: payloadText };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Postmark exception.";
    return { success: false, error: message };
  }
}

async function sendWithSendGrid(params: SendEmailParams): Promise<SendEmailResult> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!sendgridApiKey || !sendgridFromEmail) {
    return { success: false, error: "SendGrid provider is not configured." };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients.map((email) => ({ email })) }],
        from: { email: sendgridFromEmail },
        subject: params.subject,
        content: [{ type: "text/html", value: params.html }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `SendGrid API error (${response.status}): ${body}` };
    }

    console.log("Email sent successfully via SendGrid");
    return { success: true, data: { provider: "sendgrid", status: response.status } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SendGrid exception.";
    return { success: false, error: message };
  }
}

async function sendWithTwilioMainKey(params: SendEmailParams): Promise<SendEmailResult> {
  const twilioKeySid = process.env.TWILIO_API_KEY_SID;
  const twilioKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!twilioKeySid || !twilioKeySecret || !sendgridFromEmail) {
    return { success: false, error: "Twilio main-key provider is not configured." };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const basicAuth = Buffer.from(`${twilioKeySid}:${twilioKeySecret}`).toString("base64");

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients.map((email) => ({ email })) }],
        from: { email: sendgridFromEmail },
        subject: params.subject,
        content: [{ type: "text/html", value: params.html }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `Twilio main-key API error (${response.status}): ${body}` };
    }

    console.log("Email sent successfully via Twilio main-key auth");
    return { success: true, data: { provider: "twilio-main-key", status: response.status } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Twilio main-key exception.";
    return { success: false, error: message };
  }
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const configuredProvider = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (configuredProvider === "postmark") {
    return sendWithPostmark(params);
  }
  if (configuredProvider === "sendgrid") {
    return sendWithSendGrid(params);
  }
  if (configuredProvider === "twilio-main-key") {
    return sendWithTwilioMainKey(params);
  }
  const postmarkFirstAttempt = await sendWithPostmark(params);
  if (postmarkFirstAttempt.success) {
    return postmarkFirstAttempt;
  }

  const sendgridSecondAttempt = await sendWithSendGrid(params);
  if (sendgridSecondAttempt.success) {
    return sendgridSecondAttempt;
  }

  const twilioFallbackAttempt = await sendWithTwilioMainKey(params);
  if (twilioFallbackAttempt.success) {
    return twilioFallbackAttempt;
  }

  return {
    success: false,
    error: `No email provider succeeded. Postmark: ${postmarkFirstAttempt.error} | SendGrid: ${sendgridSecondAttempt.error} | Twilio main key: ${twilioFallbackAttempt.error}`,
  };
}
