# Supabase Email Templates

These email templates are designed for PocketWiseAI. Copy and paste these into your Supabase dashboard under Authentication → Email Templates.

**Note:** Email clients don't support Tailwind classes, so these use inline styles that match Tailwind's design system.

## 1. Confirm Signup Email

**Subject:** Welcome to PocketWiseAI - Confirm Your Email

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">PocketWiseAI</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Take control of your financial future</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Welcome aboard! 🎉</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Thanks for signing up for PocketWiseAI. We're excited to help you manage your finances better!
              </p>
              
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Please confirm your email address by clicking the button below:
              </p>
              
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 30px 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; color: #4b5563; font-size: 12px; font-family: monospace;">
                {{ .ConfirmationURL }}
              </p>
              
              <div style="padding: 20px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                  What's next?
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #3730a3; font-size: 14px; line-height: 20px;">
                  <li>Connect your bank accounts</li>
                  <li>Set up your budget categories</li>
                  <li>Track your expenses automatically</li>
                  <li>Achieve your financial goals</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                This link expires in 24 hours for security reasons.
              </p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                If you didn't sign up for PocketWiseAI, please ignore this email.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 PocketWiseAI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## 2. Invite User Email

**Subject:** You're Invited to Join PocketWiseAI

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; padding: 8px 16px; background-color: rgba(255, 255, 255, 0.2); border-radius: 20px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 14px; font-weight: 600;">INVITATION</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You're Invited!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Join PocketWiseAI Today</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                You've been invited to join PocketWiseAI - the smart way to manage your finances and achieve your financial goals.
              </p>
              
              <div style="padding: 20px; background-color: #fef3c7; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">
                  🎁 Special Invitation Benefits:
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 22px;">
                  <li>Free premium features for first month</li>
                  <li>Personalized onboarding assistance</li>
                  <li>Priority customer support</li>
                </ul>
              </div>
              
              <p style="margin: 20px 0 30px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Click the button below to accept your invitation and get started:
              </p>
              
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 30px 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; color: #4b5563; font-size: 12px; font-family: monospace;">
                {{ .ConfirmationURL }}
              </p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #86efac;">
                <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 16px; font-weight: 600;">
                  Why PocketWiseAI?
                </h3>
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 20px;">
                  ✓ Connect all your accounts in one place<br>
                  ✓ Automatic expense categorization<br>
                  ✓ Smart budgeting recommendations<br>
                  ✓ Goal tracking and insights<br>
                  ✓ Bank-level security
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                This invitation expires in 7 days.
              </p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                If you received this email by mistake, you can safely ignore it.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 PocketWiseAI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## 3. Magic Link Email

**Subject:** Your Login Link for PocketWiseAI

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magic Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin-bottom: 20px; line-height: 60px;">
                <span style="color: #ffffff; font-size: 30px;">🔐</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Magic Link Login</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Click to Sign In</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                We received a request to sign in to PocketWiseAI using this email address. Click the button below to sign in instantly:
              </p>
              
              <table role="presentation" style="margin: 30px auto;">
                <tr>
                  <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Sign In to My Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 30px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 20px;">
                  <strong>⚡ Quick & Secure:</strong> No password needed! This link logs you in directly and expires in 1 hour for your security.
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 30px 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; color: #4b5563; font-size: 12px; font-family: monospace;">
                {{ .ConfirmationURL }}
              </p>
              
              <div style="padding: 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #fca5a5;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  <strong>🔒 Security Notice:</strong> If you didn't request this login link, please ignore this email. Someone may have entered your email by mistake.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                This magic link expires in 1 hour.
              </p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                For security, never forward this email to anyone.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 PocketWiseAI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## 4. Change Email Address

**Subject:** Confirm Your New Email Address

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Email Change</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin-bottom: 20px; line-height: 60px;">
                <span style="color: #ffffff; font-size: 30px;">📧</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Email Change Request</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Confirm Your New Email</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                You've requested to change your email address for your PocketWiseAI account. Please confirm this change by clicking the button below:
              </p>
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                  Email Change Details:
                </p>
                <p style="margin: 0; color: #3730a3; font-size: 14px; line-height: 20px;">
                  <strong>New Email:</strong> This email address<br>
                  <strong>Requested:</strong> Just now<br>
                  <strong>IP Location:</strong> Recorded for security
                </p>
              </div>
              
              <table role="presentation" style="margin: 30px auto;">
                <tr>
                  <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Confirm Email Change
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 30px 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; color: #4b5563; font-size: 12px; font-family: monospace;">
                {{ .ConfirmationURL }}
              </p>
              
              <div style="padding: 15px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fca5a5;">
                <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                  ⚠️ Important Security Notice:
                </p>
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 20px;">
                  If you didn't request this email change, your account may be compromised. Please:
                </p>
                <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #991b1b; font-size: 14px; line-height: 20px;">
                  <li>Do NOT click the confirmation link</li>
                  <li>Sign in to your account immediately</li>
                  <li>Change your password</li>
                  <li>Contact support if you need help</li>
                </ol>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                This link expires in 24 hours.
              </p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                Need help? Contact help-desk@codesages.net
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 PocketWiseAI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## 5. Reauthentication Email

**Subject:** Security Verification Required

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reauthentication Required</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin-bottom: 20px; line-height: 60px;">
                <span style="color: #ffffff; font-size: 30px;">🔒</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Security Verification</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Verify Your Identity</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                For your security, we need to verify your identity before proceeding with a sensitive action on your account.
              </p>
              
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">
                  Why am I seeing this?
                </p>
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 20px;">
                  You're attempting to perform a sensitive action that requires additional verification, such as:
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 20px;">
                  <li>Deleting your account</li>
                  <li>Changing security settings</li>
                  <li>Accessing sensitive financial data</li>
                  <li>Modifying connected bank accounts</li>
                </ul>
              </div>
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px; font-weight: 600;">
                  Your Verification Code:
                </p>
                <p style="margin: 0; padding: 15px; background-color: #ffffff; border-radius: 4px; font-size: 32px; font-weight: 700; color: #1e40af; text-align: center; letter-spacing: 8px; font-family: monospace;">
                  {{ .Token }}
                </p>
                <p style="margin: 10px 0 0 0; color: #3730a3; font-size: 12px; text-align: center;">
                  Enter this code in your browser to continue
                </p>
              </div>
              
              <div style="padding: 15px; background-color: #fee2e2; border-radius: 6px; border: 1px solid #fca5a5; margin-top: 30px;">
                <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                  🚨 Security Alert:
                </p>
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 20px;">
                  If you didn't request this verification:
                </p>
                <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #991b1b; font-size: 14px; line-height: 20px;">
                  <li>Do NOT share this code with anyone</li>
                  <li>Someone may be trying to access your account</li>
                  <li>Change your password immediately</li>
                  <li>Enable two-factor authentication</li>
                </ol>
              </div>
              
              <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 6px;">
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 20px; text-align: center;">
                  <strong>Remember:</strong> PocketWiseAI staff will NEVER ask for this code via email, phone, or text message.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                This code expires in 10 minutes.
              </p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                Need help? Contact help-desk@codesages.net
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2024 PocketWiseAI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## How to Use These Templates

1. **Go to Supabase Dashboard** → Authentication → Email Templates
2. **For each template type**, paste the corresponding HTML
3. **Variables used:**
   - `{{ .ConfirmationURL }}` - For all templates except reauthentication
   - `{{ .Token }}` - For reauthentication only

## Notes

- **Cannot use Tailwind classes** in emails - must use inline styles
- These templates are responsive and work on all devices
- Colors match Tailwind's color palette for consistency
- Gradient backgrounds add visual appeal
- Security warnings are prominently displayed
- All templates include expiration notices
