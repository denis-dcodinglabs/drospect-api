import { PrismaService } from "src/prisma.service";
import { User } from "./user.model";
import { Injectable, NotFoundException } from "@nestjs/common";
import { UserDTO } from "src/authentication/dto/user-dto";
import { GcsUploadService } from "src/googleStorage/storage.service";
import { Multer } from "multer";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private gcsUploadService: GcsUploadService,
  ) {}

  async getAllUsers(): Promise<UserDTO[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        password: false, // Exclude the password field
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Map the Prisma user data to the UserDTO
    const usersDTO: UserDTO[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
      roles: user.userRoles.map((userRole) => userRole.role.name),
    }));

    return usersDTO;
  }

  async createUser(data: User): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async uploadProfileImage(
    imageBuffer: Buffer,
    username: string,
    originalFilename: string,
  ): Promise<string> {
    // Define the folder structure
    const folderPath = `profile-images/${username}`; // Create a folder for the user

    // Upload the image to Google Cloud Storage
    const publicUrl = await this.gcsUploadService.uploadFile(
      process.env.GCS_BUCKET_NAME,
      { originalname: originalFilename, buffer: imageBuffer } as Multer.File,
      folderPath,
      originalFilename,
    );

    return publicUrl; // Return the public URL of the uploaded image
  }

  async updateUserProfile(
    userId: string,
    firstName?: string,
    lastName?: string,
    imageUrl?: string,
  ): Promise<any> {
    const updateData: any = {};

    if (firstName) {
      updateData.firstName = firstName;
    }
    if (lastName) {
      updateData.lastName = lastName;
    }
    if (imageUrl) {
      updateData.image = imageUrl; // Update the image column with the new URL
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async getUserByUsername(username: string): Promise<Partial<User> | null> {
    // eslint-disable-next-line no-useless-catch
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          username: username,
        },
        select: {
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserEmail(email: string): Promise<Partial<User> | null> {
    // eslint-disable-next-line no-useless-catch
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async getUserFromToken(subId: string): Promise<any> {
    // eslint-disable-next-line no-useless-catch
    try {
      const data = await this.prisma.user.findUnique({
        where: {
          id: subId,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          image: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          password: false, // Exclude the password field
        },
      });

      return { data };
    } catch (error) {
      throw error;
    }
  }
}
