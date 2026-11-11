/**
 * Wrap an async route handler so a rejected promise is forwarded to the central
 * error handler via `next(err)` (explicit, independent of Express version quirks).
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next): void => {
    fn(req, res, next).catch(next);
  };
}
