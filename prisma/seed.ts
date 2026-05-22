import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not set. Check your .env file before seeding.");
}

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString }),
});

async function main() {
	const password = await bcrypt.hash("123456", 10);

	await prisma.post.deleteMany();
	await prisma.user.deleteMany();

	const admin = await prisma.user.create({
		data: {
			email: "admin@example.com",
			password,
			role: "ADMIN",
		},
	});

	const user = await prisma.user.create({
		data: {
			email: "user@example.com",
			password,
			role: "USER",
		},
	});

	await prisma.post.createMany({
		data: [
			{
				title: "Welcome post",
				content: "This is the first seeded post.",
				authorId: admin.id,
			},
			{
				title: "Second post",
				content: "This one belongs to the regular user.",
				authorId: user.id,
			},
		],
	});

	console.log("Seed completed: 2 users and 2 posts created.");
}

main()
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
