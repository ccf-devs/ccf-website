// Set mock environment variables for test execution
process.env.AUTH_SECRET = "test-auth-secret-minimum-32-characters-long-12345";
process.env.AUTH_TOTP_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.EMAIL_FROM = "test@crescentcluboffinance.com";
process.env.RESEND_API_KEY = "re_test_1234567890";
process.env.B2_ENDPOINT = "https://s3.ca-east-006.backblazeb2.com";
process.env.B2_REGION = "ca-east-006";
process.env.B2_BUCKET = "ccf-production-media";
process.env.B2_KEY_ID = "test-b2-key-id";
process.env.B2_APPLICATION_KEY = "test-b2-application-key";
