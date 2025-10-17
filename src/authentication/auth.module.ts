import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaService } from "src/prisma.service";
import { JwtStrategy } from "./jwt.strategy";
import { UserService } from "src/users/user.service";
import { UserModule } from "src/users/user.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "./auth.guard";
import { WalletService } from "src/wallet/wallet.service";
import { GcsUploadService } from "src/googleStorage/storage.service";
import { TransactionsService } from "src/transactions/transactions.service";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    JwtStrategy,
    UserService,
    JwtAuthGuard,
    WalletService,
    GcsUploadService,
    TransactionsService,
  ],
  imports: [
    UserModule,
    PassportModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    }),
  ],
})
export class AuthModule {}
