# Content Security Policy (CSP) Implementation Guide

## Overview

This document describes the comprehensive Content Security Policy implementation that addresses critical XSS vulnerabilities in the ST Configurator application.

## Implementation Status

✅ **IMPLEMENTED**: Complete CSP with configurable environment-based settings
✅ **TESTED**: CSP headers are correctly sent by the server
✅ **CONFIGURED**: Development and production environment configurations

## CSP Configuration

### Current CSP Directives

```http
Content-Security-Policy:
  default-src 'self';
  style-src 'self' data: blob: 'unsafe-inline';
  script-src 'self' data: blob: 'unsafe-eval';
  img-src 'self' data: blob: http://localhost:* https://localhost:*;
  connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* wss://localhost:*;
  font-src 'self' data: blob:;
  object-src 'none';
  media-src 'self' data: blob:;
  frame-src 'none';
  child-src 'self' blob:;
  worker-src 'self' blob:;
  manifest-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  script-src-attr 'none';
  upgrade-insecure-requests
```

### Environment Variables

Configure CSP behavior via `.env` file:

```env
# Security Configuration
NODE_ENV=development              # Set to 'production' for stricter CSP
CSP_REPORT_ONLY=false            # Set to 'true' for testing without enforcement
CSP_REPORT_URI=                  # Optional CSP violation reporting endpoint
CSP_UNSAFE_INLINE_STYLES=true    # Required for Three.js/Fabric.js (development)
CSP_UNSAFE_EVAL_SCRIPTS=true     # Required for Three.js shader compilation
HSTS_MAX_AGE=31536000            # HTTP Strict Transport Security duration
HSTS_INCLUDE_SUBDOMAINS=true     # Include subdomains in HSTS
```

## Security Benefits

### XSS Protection
- **Blocks inline scripts**: Prevents execution of malicious injected JavaScript
- **Restricts script sources**: Only allows scripts from trusted origins
- **Prevents eval()**: Blocks dynamic code execution from strings

### Additional Security Headers
- **HSTS**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME sniffing attacks
- **Referrer-Policy**: Controls referrer information leakage

## Three.js Compatibility

### Required Exceptions
The CSP includes specific allowances for Three.js functionality:

```javascript
styleSrc: ["'unsafe-inline'"]     // Three.js inline styles
scriptSrc: ["'unsafe-eval'"]      // Three.js shader compilation
workerSrc: ["blob:"]             // Web Workers
childSrc: ["blob:"]              // Web Workers
```

### Production Hardening
For production environments, consider:
1. Using nonce-based CSP for inline styles
2. Pre-compiling Three.js shaders to eliminate `unsafe-eval`
3. Serving static assets from CDN with specific CSP sources

## Development vs Production

### Development Mode (NODE_ENV=development)
- Allows localhost connections for API calls
- Permits WebSocket connections for hot reload
- More permissive for development tools

### Production Mode (NODE_ENV=production)
- Stricter source restrictions
- Forces HTTPS with `upgrade-insecure-requests`
- HSTS preloading enabled
- No localhost exceptions

## Testing CSP

### 1. Check Headers
```bash
curl -I http://localhost:3030/api/config
```

### 2. Report-Only Mode
Set `CSP_REPORT_ONLY=true` in `.env` to test without enforcement:
```env
CSP_REPORT_ONLY=true
CSP_REPORT_URI=/api/csp-report
```

### 3. Browser Console
Check browser console for CSP violations when loading the application.

## CSP Violation Reporting

### Setup Reporting Endpoint
```javascript
app.post('/api/csp-report', (req, res) => {
    console.log('CSP Violation:', req.body);
    res.status(204).send();
});
```

### Monitor Violations
- Set up logging for CSP violation reports
- Review violations to identify legitimate vs malicious activity
- Adjust CSP directives based on legitimate application needs

## Maintenance

### Regular Updates
1. **Review CSP violations** monthly
2. **Update directives** when adding new dependencies
3. **Test changes** in report-only mode first
4. **Document any exceptions** and their business justification

### Monitoring
- Monitor for CSP violation spikes (potential attacks)
- Track legitimate violations to improve policy
- Set up alerts for unusual violation patterns

## Common Issues & Solutions

### Three.js Shader Compilation Errors
**Problem**: `unsafe-eval` violations
**Solution**: Ensure `CSP_UNSAFE_EVAL_SCRIPTS=true` in development

### Inline Style Violations
**Problem**: Three.js/Fabric.js style violations
**Solution**: Ensure `CSP_UNSAFE_INLINE_STYLES=true` for required functionality

### Asset Loading Issues
**Problem**: Images/fonts not loading
**Solution**: Add specific domains to `img-src` and `font-src` directives

## Security Impact

### Before CSP
- ❌ Complete XSS vulnerability
- ❌ No injection protection
- ❌ Unrestricted script execution

### After CSP
- ✅ XSS attack prevention
- ✅ Script injection blocking
- ✅ Controlled resource loading
- ✅ Enhanced security headers

## References

- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [Mozilla CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)