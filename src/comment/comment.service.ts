import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { CreateCommentDto } from "./dto/comments.dto";

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async createComment(data: CreateCommentDto) {
    const comment = await this.prisma.comment.create({
      data: { ...data, imageId: data.imageId },
      select: {
        imageId: true,
        comment: true,
        createdAt: true,
        id: true,
        username: true,
      },
    });
    return {
      message: "Ok!",
      data: {
        projectId: comment.imageId,
        comment: comment.comment,
        id: comment.id,
        username: comment.username,
        createdAt: comment.createdAt,
      },
    };
  }

  async getCommentsByProjectId(imageId: number) {
    const data = await this.prisma.comment.findMany({
      where: { imageId },
      select: {
        id: true,
        username: true,
        imageId: true,
        comment: true,
        createdAt: true,
      },
    });
    return { message: "Ok!", data };
  }

  async editComment(id: number, comment: string) {
    const data = await this.prisma.comment.update({
      where: { id },
      data: { comment: comment },
      select: { id: true, imageId: true, comment: true, updatedAt: true },
    });
    return {
      message: "Ok!",
      data,
    };
  }

  async deleteComment(id: number) {
    const existingComment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException(`Comment not found with id: ${id}`);
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: "Ok!" };
  }
}
