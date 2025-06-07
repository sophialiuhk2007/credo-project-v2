import { Request, Response, NextFunction } from "express";

// Extend Express Request interface to include isAuthenticated
declare global {
  namespace Express {
    interface Request {
      isAuthenticated?: () => boolean;
    }
  }
}

const isLoggedIn = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return Promise.resolve(
      res.status(401).json({
        error: "User must sign in",
      })
    );
  }
  next();
  return Promise.resolve();
};

export default {
  isLoggedIn,
};
