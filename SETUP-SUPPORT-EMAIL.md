# Setting Up support@evangelosommer.com

This guide walks you through setting up support@evangelosommer.com as the admin email for your CRM project.

## Overview

You need to:
1. Create the email account on your mail server
2. Configure SMTP authentication
3. Test sending and receiving emails
4. Update Google OAuth consent screen
5. Configure email client (optional)

---

## Step 1: Create Email Account on Mail Server

### Option A: If you have cPanel/Webmail access

1. **Login to cPanel**
   - Go to: https://mail.evangelosommer.com:2083
   - Or: Your hosting provider's cPanel URL
   - Username: Your hosting username
   - Password: Your hosting password

2. **Create Email Account**
   - Find "Email Accounts" section
   - Click "Create"
   - Fill in:
     * Email: `support`
     * Domain: `evangelosommer.com` (should auto-fill)
     * Password: `NewPass123!` (or choose a new secure password)
     * Storage Space: Unlimited (or appropriate limit)
   - Click "Create"

3. **Verify Account Created**
   - You should see support@evangelosommer.com in the email accounts list
   - Note the quota and storage settings

### Option B: If you have Plesk access

1. **Login to Plesk**
   - Go to: https://your-server-ip:8443
   - Or: Your hosting provider's Plesk URL
   - Enter your credentials

2. **Navigate to Email**
   - Click on "Mail" in the left sidebar
   - Select your domain: evangelosommer.com

3. **Create Email Address**
   - Click "Create Email Address"
   - Email address: `support`
   - Password: `NewPass123!` (or choose a new secure password)
   - Mailbox: Enable
   - Size: Set appropriate limit
   - Click "OK"

### Option C: If you have hosting provider dashboard

1. **Login to Your Hosting Provider**
   - GoDaddy: https://account.godaddy.com
   - Bluehost: https://my.bluehost.com
   - HostGator: https://portal.hostgator.com
   - SiteGround: https://my.siteground.com
   - Namecheap: https://ap.www.namecheap.com

2. **Find Email Management**
   - Look for "Email", "Email Accounts", or "Workspace Email"
   - Select domain: evangelosommer.com

3. **Create New Email**
   - Click "Add Email" or "Create Email Address"
   - Username: `support`
   - Domain: evangelosommer.com
   - Password: `NewPass123!` (or new secure password)
   - Save/Create

### Option D: Create Email Alias/Forwarding (Simpler Alternative)

If you want support@evangelosommer.com to forward to an existing email:

1. **Access Email Settings** (via cPanel, Plesk, or hosting dashboard)

2. **Create Forwarder/Alias**
   - Go to "Forwarders" or "Email Aliases"
   - Create new forwarder:
     * From: support@evangelosommer.com
     * To: admin@evangelosommer.com (or your existing email)
   - Save

**Note:** If using forwarding, you'll still need SMTP authentication for the actual account (admin@evangelosommer.com).

---

## Step 2: Test Email Access

### Test via Webmail

1. **Access Webmail**
   - Go to: https://mail.evangelosommer.com/webmail
   - Or: https://webmail.evangelosommer.com
   - Or: Your hosting provider's webmail URL

2. **Login**
   - Email: support@evangelosommer.com
   - Password: NewPass123! (or your chosen password)

3. **Verify Access**
   - You should see the inbox
   - Try sending a test email to yourself
   - Check if you can receive emails

### Test SMTP Credentials (Important!)

Run this test to verify SMTP authentication works:

```bash
# Install swaks (SMTP test tool) if needed
# macOS: brew install swaks
# Linux: apt-get install swaks

# Test SMTP connection
swaks \
  --to your-personal-email@gmail.com \
  --from support@evangelosommer.com \
  --server mail.evangelosommer.com:587 \
  --auth LOGIN \
  --auth-user support@evangelosommer.com \
  --auth-password "49\$9#03N1x" \
  --tls

# If successful, you'll see: "250 2.0.0 Ok: queued as..."
```

Alternative test using OpenSSL:

```bash
# Connect to SMTP server
openssl s_client -starttls smtp -connect mail.evangelosommer.com:587

# After connected, type:
EHLO evangelosommer.com
AUTH LOGIN
# Enter base64 encoded username: c3VwcG9ydEBldmFuZ2Vsb3NvbW1lci5jb20=
# Enter base64 encoded password: TmV3UGFzczEyMyE=
# Should see: 235 2.7.0 Authentication successful
QUIT
```

---

## Step 3: Update Environment Variables

Your `.env.local` is already updated with support@evangelosommer.com!

Verify these lines exist:

```bash
ADMIN_EMAIL=support@evangelosommer.com
EMAIL_SERVER_USER=support@evangelosommer.com
EMAIL_FROM=support@evangelosommer.com
SMTP_USER=support@evangelosommer.com
SMTP_FROM=support@evangelosommer.com
```

✅ Already done!

---

## Step 4: Update Google OAuth Consent Screen

### Verify Current Email

1. Go to: https://console.cloud.google.com
2. Select your project (with Client ID: 650241747306...)
3. Go to "APIs & Services" → "OAuth consent screen"
4. Check current support email

### Update Support Email

1. Click "EDIT APP" button
2. Update these fields:
   - **User support email:** support@evangelosommer.com
   - **Developer contact information:** support@evangelosommer.com
3. Click "SAVE AND CONTINUE" through all steps

### Verify Email Address (Important!)

1. Google will send a verification email to support@evangelosommer.com
2. Check your inbox:
   - Via webmail: https://mail.evangelosommer.com/webmail
   - Or via email client if configured
3. Open the email from Google
4. Click the verification link
5. Confirm verification success

**Note:** If you don't verify, OAuth consent screen will show a warning and may not work properly.

---

## Step 5: Test Email Sending from Application

### Start Development Server

```bash
npm run dev
```

### Test Authentication

1. Go to: http://localhost:3000/auth/signin
2. Login with:
   - Email: support@evangelosommer.com
   - Password: [your admin password]

### Test Email Sending (if applicable)

If your app has email sending functionality:
1. Navigate to a feature that sends emails (receipts, notifications, etc.)
2. Trigger an email send
3. Check the recipient's inbox
4. Verify sender shows: support@evangelosommer.com

### Check Application Logs

Monitor for any email errors:
```bash
# Look for SMTP errors in console
# Should see successful connections like:
# "Email sent successfully to recipient@example.com"
```

---

## Step 6: Configure Email Client (Optional)

If you want to access support@evangelosommer.com from your email client:

### Gmail (Add as Another Account)

1. Open Gmail → Settings (gear icon) → "See all settings"
2. Go to "Accounts and Import" tab
3. Click "Add another email address"
4. Enter: support@evangelosommer.com
5. SMTP Server: mail.evangelosommer.com
6. Port: 587
7. Username: support@evangelosommer.com
8. Password: NewPass123!
9. Verify and confirm

### Apple Mail

1. Open Mail → Mail Menu → "Add Account"
2. Choose "Other Mail Account"
3. Name: Evangelo Sommer Support
4. Email: support@evangelosommer.com
5. Password: NewPass123!
6. **Incoming Mail Server:**
   - Type: IMAP
   - Server: mail.evangelosommer.com
   - Port: 993
   - SSL: Yes
   - Username: support@evangelosommer.com
7. **Outgoing Mail Server (SMTP):**
   - Server: mail.evangelosommer.com
   - Port: 587
   - TLS: Yes
   - Username: support@evangelosommer.com
   - Password: NewPass123!

### Outlook

1. File → Add Account
2. Enter: support@evangelosommer.com
3. Click "Advanced options" → "Let me set up my account manually"
4. Select "IMAP"
5. **Incoming mail:**
   - Server: mail.evangelosommer.com
   - Port: 993
   - Encryption: SSL/TLS
6. **Outgoing mail:**
   - Server: mail.evangelosommer.com
   - Port: 587
   - Encryption: STARTTLS
7. Username: support@evangelosommer.com
8. Password: NewPass123!

### Thunderbird

1. Tools → Account Settings → Account Actions → Add Mail Account
2. Your name: Evangelo Sommer
3. Email: support@evangelosommer.com
4. Password: NewPass123!
5. Click "Configure manually"
6. **Incoming:**
   - Protocol: IMAP
   - Server: mail.evangelosommer.com
   - Port: 993
   - SSL: SSL/TLS
   - Authentication: Normal password
7. **Outgoing:**
   - Server: mail.evangelosommer.com
   - Port: 587
   - SSL: STARTTLS
   - Authentication: Normal password
8. Username: support@evangelosommer.com
9. Click "Done"

---

## Step 7: Production Deployment (Vercel)

Once local testing is successful, add to Vercel:

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select project: "evangelosommer"

2. **Add/Update Environment Variables**
   - Settings → Environment Variables
   - Update or add:
     * `ADMIN_EMAIL` = support@evangelosommer.com
     * `EMAIL_SERVER_USER` = support@evangelosommer.com
     * `EMAIL_FROM` = support@evangelosommer.com
     * `SMTP_USER` = support@evangelosommer.com
     * `SMTP_FROM` = support@evangelosommer.com
   - Select: Production, Preview, Development
   - Save

3. **Redeploy**
   - Deployments tab
   - Click "..." → "Redeploy"

---

## Troubleshooting

### "Authentication failed" error

**Problem:** SMTP authentication is failing

**Solutions:**
1. Verify email account exists: Login to webmail
2. Check password is correct: Try logging into webmail
3. Verify SMTP settings in .env.local:
   ```bash
   SMTP_HOST=mail.evangelosommer.com
   SMTP_PORT=587
   SMTP_USER=support@evangelosommer.com
   SMTP_PASS_B64=TmV3UGFzczEyMyE=
   ```
4. If password changed, re-encode in base64:
   ```bash
   echo -n "your-new-password" | base64
   ```

### "Connection refused" error

**Problem:** Can't connect to mail server

**Solutions:**
1. Verify mail server is running: `telnet mail.evangelosommer.com 587`
2. Check firewall isn't blocking port 587
3. Try alternative port (465 for SSL): Update SMTP_PORT=465

### "Email not received"

**Problem:** Emails sent but not arriving

**Solutions:**
1. Check spam folder
2. Verify DNS records (SPF, DKIM, DMARC):
   ```bash
   dig TXT evangelosommer.com
   dig TXT _dmarc.evangelosommer.com
   ```
3. Check mail server logs (via cPanel or hosting dashboard)
4. Test with external email tester: https://www.mail-tester.com

### Google OAuth verification email not received

**Problem:** Google's verification email not arriving

**Solutions:**
1. Check support@evangelosommer.com inbox via webmail
2. Check spam folder
3. Resend verification:
   - Google Cloud Console → OAuth consent screen
   - Click "Resend verification email"
4. Verify email account is active and receiving emails

---

## Verification Checklist

Before moving to production, verify:

- [ ] support@evangelosommer.com email account created
- [ ] Can login to webmail successfully
- [ ] Can send test email from webmail
- [ ] Can receive test email in webmail
- [ ] SMTP authentication works (swaks test passes)
- [ ] .env.local updated with support@evangelosommer.com
- [ ] Application can send emails locally (test in dev)
- [ ] Google OAuth consent screen updated
- [ ] Google verification email received and confirmed
- [ ] Email client configured (optional)
- [ ] Vercel environment variables updated
- [ ] Production deployment successful
- [ ] Production email sending works

---

## Quick Reference

### Email Account Details
- **Email:** support@evangelosommer.com
- **Password:** NewPass123!
- **Webmail:** https://mail.evangelosommer.com/webmail

### SMTP Settings
- **Server:** mail.evangelosommer.com
- **Port:** 587 (STARTTLS) or 465 (SSL)
- **Username:** support@evangelosommer.com
- **Password:** NewPass123!
- **Security:** TLS/STARTTLS

### IMAP Settings (for email clients)
- **Server:** mail.evangelosommer.com
- **Port:** 993
- **Security:** SSL/TLS
- **Username:** support@evangelosommer.com
- **Password:** NewPass123!

---

## Support

If you encounter issues:
1. Check your hosting provider's documentation
2. Contact hosting support for mail server issues
3. Review SECURITY.txt for deployment troubleshooting
4. Check application logs for specific error messages
