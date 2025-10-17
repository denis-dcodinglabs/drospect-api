import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Delete,
  Put,
  UseGuards,
  Req,
} from "@nestjs/common";
import { CommentService } from "./comment.service";
import { CreateCommentDto } from "./dto/comments.dto";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import { getDecodedToken } from "src/decodedToken/getSubIdFromToken";

@UseGuards(JwtAuthGuard)
@Controller("comments")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  async create(
    @Req() request: Request,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    try {
      const authorizationHeader = request.headers["authorization"];
      const decodedToken = getDecodedToken(authorizationHeader) as {
        username: string;
        [key: string]: any;
      };

      // Extract the username
      const username = decodedToken.username;
      const commentData = {
        ...createCommentDto,
        username,
      };

      // Log the username
      return await this.commentService.createComment(commentData);
    } catch (err) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "CommentCreationError",
            message: err.message || "Failed to create comment!",
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("image/:imageId")
  async findByImageId(@Param("imageId") projectId: string) {
    try {
      return await this.commentService.getCommentsByProjectId(+projectId);
    } catch (err) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "CommentsFetchError",
            message: err.message || "Failed to fetch comments!",
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body("comment") comment: string) {
    try {
      return await this.commentService.editComment(+id, comment);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    try {
      return await this.commentService.deleteComment(+id);
    } catch (err) {
      throw new HttpException(
        {
          status: "Error",
          error: {
            type: "CommentDeletionError",
            message: err.message || "Failed to delete comment!",
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
