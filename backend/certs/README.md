# TLS / SSL Certificates Configuration

To deploy CampusCare with HTTPS in production:

1. Obtain trusted certificates via Let's Encrypt (Certbot) or university institutional CA:
   - `fullchain.pem` (Certificate & Intermediate chain)
   - `privkey.pem` (Private key)
2. Place production certificates in this directory or mount them via Docker volumes.
3. **NEVER** commit private keys (`*.key`, `*.pem`) to Git.
4. When TLS is enabled, configure `.env`:
   ```env
   APP_URL=https://campuscare.youruniversity.edu
   FRONTEND_URL=https://campuscare.youruniversity.edu
   ```
   PHP sessions will automatically activate `secure` cookie attributes.
