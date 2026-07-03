import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  
  if (!decoded) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }

  req.user = decoded;
  next();
}

export function authorizeRoles(...roles: ('rider' | 'driver' | 'admin')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Access forbidden. Insufficient permissions.' });
    }

    next();
  };
}
