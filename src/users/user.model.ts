import { Prisma } from "@prisma/client";

export class User implements Prisma.UserCreateInput {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
}
