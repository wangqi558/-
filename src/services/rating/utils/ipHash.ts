import crypto from 'crypto';

/**
 * Hash IP address for anonymous ratings
 * Uses SHA-256 with a salt for security
 */
export function hashIPAddress(ipAddress: string): string {
  // Add a salt to prevent rainbow table attacks
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-in-production';
  
  // Create hash
  const hash = crypto.createHash('sha256');
  hash.update(`${ipAddress}:${salt}`);
  
  return hash.digest('hex');
}

/**
 * Validate IP address format
 */
export function isValidIPAddress(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 validation (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get client IP from request
 */
export function getClientIP(request: any): string {
  // Check common headers for forwarded IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of headers) {
    const value = request.headers[header];
    if (value) {
      // Handle multiple IPs in x-forwarded-for
      const ips = Array.isArray(value) ? value[0] : value;
      const ip = ips.split(',')[0].trim();
      if (isValidIPAddress(ip)) {
        return ip;
      }
    }
  }

  // Fallback to remote address
  return request.ip || request.connection?.remoteAddress || 'unknown';
}
