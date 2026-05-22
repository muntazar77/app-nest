import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Check your .env file before starting the app.");
    }

    const adapter = new PrismaPg({
      connectionString,
    });
    super({ adapter });
    console.log("PrismaService initialized with PostgreSQL adapter");
  }
}