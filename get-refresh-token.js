// Gmail API Refresh Token Generator
// Run: node get-refresh-token.js

const { google } = require('googleapis');
const readline = require('readline');

console.log('🚀 Gmail API Refresh Token Generator\n');

// You'll need to replace these with your actual credentials from Google Cloud Console
const CLIENT_ID = 'your-client-id-from-google-cloud-console';
const CLIENT_SECRET = 'your-client-secret-from-google-cloud-console';
const REDIRECT_URI = 'http://localhost:3001/auth/google/callback';

if (CLIENT_ID === 'your-client-id-from-google-cloud-console') {
  console.log('❌ Please update CLIENT_ID and CLIENT_SECRET in this file first!');
  console.log('📝 Get them from Google Cloud Console → APIs & Services → Credentials');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate the authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
  prompt: 'consent', // Forces refresh token to be returned
});

console.log('📋 Step 1: Visit this URL in your browser:');
console.log('🔗', authUrl);
console.log('\n📱 Step 2: Authorize the application');
console.log('📝 Step 3: Copy the authorization code from the redirect URL\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    console.log('\n⏳ Getting tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      console.log('\n✅ Success! Add these to your .env.local file:\n');
      console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`GMAIL_FROM_EMAIL=contact@evangelosommer.com`);
      console.log('\n🎉 Then restart your dev server and test sending emails!');
    } else {
      console.log('❌ No refresh token received. Try running the script again.');
      console.log('💡 Make sure you\'re authorizing for the first time or revoking access first.');
    }
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
    console.log('💡 Make sure the authorization code is correct and hasn\'t expired.');
  }
  rl.close();
});

rl.on('close', () => {
  console.log('\n👋 Setup complete! Check the instructions above.');
});