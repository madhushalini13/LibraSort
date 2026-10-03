import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// This proxy must precede body parsing so Clerk's frontend requests are
// forwarded with their original request body.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

app.use(
  (
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    req.log.error({ error }, "API request failed");
    if (res.headersSent) {
      next(error);
      return;
    }
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    const databaseUnavailable = [
      "ECONNREFUSED",
      "ECONNRESET",
      "57P03",
      "08000",
      "08003",
      "08006",
    ].includes(code);
    res
      .status(databaseUnavailable ? 503 : 500)
      .json({
        error: databaseUnavailable
          ? "Unable to connect to the library database. Please try again."
          : "The request could not be completed. Please try again.",
      });
  },
);

export default app;
