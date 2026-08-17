# ============================================================================
# STAGE 5: FULL PRODUCTION SECURITY SETUP CHECKLIST
# ============================================================================
# Critical security actions to perform BEFORE deploying to production

# ============================================================================
# 1. SUPABASE ROW LEVEL SECURITY (RLS) VERIFICATION
# ============================================================================
# CRITICAL: Verify RLS is enabled and properly configured on all tables

## SQL Commands to Run in Supabase SQL Editor:

-- Check RLS status on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- List all RLS policies for verification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

## Specific RLS Policy Verification:

### profiles table
-- Users can only view their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

### books table
-- Everyone can view available books
CREATE POLICY IF NOT EXISTS "Anyone can view books"
  ON books FOR SELECT
  USING (true);

-- Only book owners can update their books
CREATE POLICY IF NOT EXISTS "Owners can update own books"
  ON books FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Only book owners can delete their books
CREATE POLICY IF NOT EXISTS "Owners can delete own books"
  ON books FOR DELETE
  USING (seller_id = auth.uid());

-- Admins can update any book
CREATE POLICY IF NOT EXISTS "Admins can update any book"
  ON books FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

### notifications table
-- Users can only view their own notifications
CREATE POLICY IF NOT EXISTS "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update (mark as read) their own notifications
CREATE POLICY IF NOT EXISTS "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin users can insert notifications
CREATE POLICY IF NOT EXISTS "Admin users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Service role can insert notifications
CREATE POLICY IF NOT EXISTS "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Users cannot delete notifications
CREATE POLICY IF NOT EXISTS "Users cannot delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (false);

## Verification Commands:
-- Test RLS by simulating different users
SET ROLE authenticated;
SET request.jwt.claim.sub = 'USER_ID_TO_TEST';
SELECT * FROM profiles; -- Should only return user's own profile
SELECT * FROM notifications; -- Should only return user's own notifications

# ============================================================================
# 2. SECRETS MANAGEMENT
# ============================================================================
# CRITICAL: Never commit secrets to code. Use secure secret management.

## Recommended Secret Storage Options:

### Option A: Vercel Environment Variables (Recommended for Vercel Deployment)
# Go to Vercel Dashboard → Project → Settings → Environment Variables
# Add these secrets:
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-gemini-api-key

### Option B: GitHub Secrets (For CI/CD)
# Go to GitHub Repository → Settings → Secrets and variables → Actions
# Add these secrets:
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
SNYK_TOKEN (for security scanning)

### Option C: AWS Secrets Manager (For AWS Deployment)
# Store secrets in AWS Secrets Manager
# Retrieve them at runtime using AWS SDK
# Example:
aws secretsmanager get-secret-value --secret-id prod/supabase --region us-east-1

### Option D: Docker Secrets (For Docker/Kubernetes Deployment)
# Use Docker secrets or Kubernetes secrets
# Mount secrets as files in container
# Example in docker-compose.yml:
secrets:
  supabase_url:
    file: ./secrets/supabase_url.txt
services:
  app:
    secrets:
      - supabase_url

## NEVER DO:
❌ Commit .env files to git
❌ Hardcode API keys in source code
❌ Store secrets in public GitHub repositories
❌ Use .env files in production builds
❌ Log secrets in application logs

## ALWAYS DO:
✅ Use environment-specific .env files (.env.local for development only)
✅ Rotate secrets regularly
✅ Use different keys for development, staging, and production
✅ Implement secret rotation strategy
✅ Audit secret access logs
✅ Use principle of least privilege for service accounts

# ============================================================================
# 3. SECURE HEADERS CONFIGURATION
# ============================================================================
# CRITICAL: Add security headers to next.config.js

## Update next.config.js with security headers:

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.googleapis.com wss://*.supabase.co",
              "frame-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; ')
          },
          // HTTP Strict Transport Security (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // Prevent Clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

## Additional Security Headers for API Routes:
# Add these to your API route handlers or middleware:
app.use((req, res, next) => {
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

# ============================================================================
# 4. ADDITIONAL SECURITY CONFIGURATIONS
# ============================================================================

## A. Enable HTTPS Only
# Force HTTPS in production by adding to next.config.js:
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // Redirect HTTP to HTTPS
}

## B. Rate Limiting
# Implement rate limiting for API routes to prevent DDoS attacks
# Use libraries like 'express-rate-limit' or 'upstash/ratelimit'

## C. Input Validation
# Validate all user inputs using Zod schemas
# Never trust client-side validation

## D. SQL Injection Prevention
# Use parameterized queries (Supabase client handles this automatically)
# Never concatenate user input into SQL queries

## E. Authentication Security
# Enable 2FA for admin accounts
- Implement session timeout
- Use secure, httpOnly cookies for sessions
- Implement CSRF protection

## F. File Upload Security
# Validate file types and sizes
# Scan uploaded files for malware
# Store files in secure storage (Supabase Storage with RLS)

## G. Logging and Monitoring
# Enable security logging
- Monitor failed login attempts
- Log suspicious activities
- Set up alerts for security events

## H. Backup Strategy
# Regular database backups
- Automated daily backups
- Point-in-time recovery enabled
- Test backup restoration regularly

## I. Dependency Updates
# Regularly update dependencies
- Use `npm audit` regularly
- Subscribe to security advisories
- Automate dependency updates with Dependabot

## J. Access Control
- Implement role-based access control (RBAC)
- Regularly audit user permissions
- Remove inactive user accounts

# ============================================================================
# 5. PRE-DEPLOYMENT VERIFICATION CHECKLIST
# ============================================================================

## Database Security:
- [ ] RLS enabled on all tables
- [ ] RLS policies tested and verified
- [ ] Service role key secured (not in client code)
- [ ] Database backups configured
- [ ] Point-in-time recovery enabled

## Application Security:
- [ ] All secrets moved to environment variables
- [ ] No .env files in git repository
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Rate limiting implemented
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info

## Infrastructure Security:
- [ ] Docker image scanned for vulnerabilities
- [ ] Container running as non-root user
- [ ] Minimal base image used
- [ ] No unnecessary packages in image
- [ ] Secrets not in Docker image layers

## CI/CD Security:
- [ ] Security scanning in pipeline
- [ ] Automated dependency audits
- [ ] Secrets stored in GitHub/Vercel/AWS
- [ ] Branch protection rules enabled
- [ ] Required approvals for production deployment

## Monitoring:
- [ ] Application monitoring configured
- [ ] Error tracking (Sentry, etc.)
- [ ] Performance monitoring
- [ ] Security event logging
- [ ] Alert system configured

# ============================================================================
# 6. POST-DEPLOYMENT SECURITY MONITORING
# ============================================================================

## Continuous Security Monitoring:
- Set up automated security alerts
- Monitor for unusual traffic patterns
- Track failed authentication attempts
- Monitor database query performance
- Review access logs regularly

## Regular Security Audits:
- Monthly dependency updates
- Quarterly security penetration testing
- Annual security review
- Regular RLS policy audits
- Secret rotation every 90 days

## Incident Response Plan:
- Document security incident response procedures
- Have contact information for security team
- Prepare rollback procedures
- Test incident response regularly
