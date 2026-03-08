export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // For now, just log the email content
  console.log('Email would be sent:', options);
  return true;
};

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const html = `
    <html>
      <body>
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </body>
    </html>
  `;

  const text = `
    Password Reset Request
    
    You requested a password reset for your account.
    
    Please visit: ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request',
    text,
    html
  });
};

export const sendSuspensionEmail = async (
  email: string,
  duration: string,
  reason: string,
  expiresAt?: Date
): Promise<boolean> => {
  const durationText = duration === 'permanent' ? 'permanently' : `for ${duration}`;
  const expiresText = expiresAt ? `Your suspension will be lifted on ${expiresAt.toLocaleDateString()}.` : '';
  
  const html = `
    <html>
      <body>
        <h2>Account Suspension</h2>
        <p>Your account has been suspended ${durationText} due to a violation of our terms of service.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>${expiresText}</p>
        <p>If you believe this is an error, please contact our support team.</p>
      </body>
    </html>
  `;

  const text = `
    Account Suspension
    
    Your account has been suspended ${durationText} due to a violation of our terms of service.
    
    Reason: ${reason}
    
    ${expiresText}
    
    If you believe this is an error, please contact our support team.
  `;

  return sendEmail({
    to: email,
    subject: 'Account Suspension Notice',
    text,
    html
  });
};
