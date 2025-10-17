import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SoftDeleteMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;

      if (req.method === 'DELETE') {
        // Perform soft deletion for DELETE requests
        const client = await this.prisma.client.findUnique({
          where: { id },
        });

        let message = '';

        if (client && client.deletedAt === null) {
          // The client exists and has not been deleted yet
          await this.prisma.client.update({
            where: { id },
            data: {
              deletedAt: new Date(),
            },
          });
          message = `Deleted client with ID: ${id}`;
        } else {
          // Handle the case where the client doesn't exist or is already deleted
          message = `Client with ID ${id} not found or already deleted.`;
        }

        // Store the message in the request object
        req['softDeleteMessage'] = message;
      } else if (req.method === 'GET') {
        // For GET requests, set softDeleteFilter in the request object
        req['softDeleteFilter'] = {
          where: {
            deletedAt: null,
          },
        };
      } else if (req.method === 'PUT') {
        // PUT request logic
        const existingClient = await this.prisma.client.findUnique({
          where: { id },
        });

        if (!existingClient) {
          return res
            .status(404)
            .json({ message: `Client with ID ${id} not found.` });
        }

        if (existingClient.deletedAt !== null) {
          return res
            .status(400)
            .json({ message: `Client with ID ${id} not found.` });
        }
      }

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      // Handle errors
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
