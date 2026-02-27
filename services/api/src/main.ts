import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  const nodeEnv = configService.get<string>("NODE_ENV", "development");
  app.enableCors({
    origin: getCorsOrigins(configService.get<string>("CORS_ORIGIN"), nodeEnv),
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Aikad Marketplace API")
    .setDescription("Backend service for the Aikad marketplace.")
    .setVersion("1.0.0")
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);

  const port = configService.get<number>("PORT", 3001);
  await app.listen(port);
}

function getCorsOrigins(corsOrigin: string | undefined, nodeEnv: string) {
  if (!corsOrigin) {
    if (nodeEnv === "development") {
      return ["http://localhost:3000", "http://localhost:3002"];
    }
    throw new Error("CORS_ORIGIN must be set outside development.");
  }

  return corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

bootstrap();
