import { Request, Response, NextFunction } from "express";
import { logDebug } from "../utils/logger";

export default (req: Request, _res: Response, next: NextFunction) => {
    const transaction_id = req.body?.transaction_id;
    logDebug({message: `Request Log`, transaction_id, meta: {
        method: req.method,
        url: req.url,
        body: req.body
    }});
    next();
};
  