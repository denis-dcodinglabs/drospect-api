import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as bodyParser from "body-parser";
import { LargePayloadMiddleware } from "./middlewares/large-payload.middleware";
import { ValidationPipe } from "@nestjs/common";
import { HttpExceptionFilter } from "./helpers/httoexception-filter-helper";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api"); // <-- Make sure you're aware of this
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter()); // Apply the custom exception filter

  // HTTP/2 Optimizations for faster uploads
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["https://drospect-fe.caprover-root.drospect.ai/"];
  const cors = {
    origin: corsOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  };
  app.enableCors(cors);

  // Set a global prefix for all routes
  app.setGlobalPrefix("api");

  // Apply middleware for large payloads on the specific route
  const largePayloadMiddleware = new LargePayloadMiddleware();

  // Apply middleware for large payloads on the specific route
  app.use(
    "/api/projects/upload",
    largePayloadMiddleware.use.bind(largePayloadMiddleware)
  );

  // Apply raw body parser for Stripe webhooks before global JSON parser
  app.use("/api/stripe/webhook", (req, res, next) => {
    if (req.method === "POST") {
      bodyParser.raw({ type: "application/json" })(req, res, next);
    } else {
      next();
    }
  });

  // Apply global body parser middleware with a 30MB limit, excluding /projects/upload
  app.use((req, res, next) => {
    if (
      req.url.startsWith("/api/projects/upload") ||
      req.url === "/api/stripe/webhook"
    ) {
      next(); // Skip global body parser for /projects/upload and webhook
    } else {
      bodyParser.json({ limit: "30mb" })(req, res, next); // Apply global limit
    }
  });

  // Error handling middleware for payload size issues
  // app.use(function (err, req, res, next) {
  //   if (err.type === 'entity.too.large') {
  //     res.status(413).json({
  //       error: 'Payload Too Large',
  //       message: 'Please upload a smaller file.',
  //     });
  //   } else {
  //     next(err);
  //   }
  // });

  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 8080);
}
bootstrap();
