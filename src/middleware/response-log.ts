import { Request, Response, NextFunction } from "express";
import { logDebug } from "../utils/logger";

export default (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const originalSend = res.send;
    res.json = function (data: any) {
        const transaction_id = req.body?.context?.transaction_id;
        logDebug({
            message: `Response Log`,
            transaction_id,
            meta: {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                body: data,
            },
        });

        // Call the original res.json with the data
        return originalJson.call(this, data);
    };
    res.send = function (data: any) {
        const transaction_id = req.body?.context?.transaction_id;
        logDebug({
            message: `Response Log`,
            transaction_id,
            meta: {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                body: data,
            },
        });

        // Call the original res.send with the data
        return originalSend.call(this, data);
    };
    next();
};
