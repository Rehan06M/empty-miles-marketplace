
import "dotenv/config";
import { prisma } from "./prisma.js";

async function main() {
  await prisma.$connect();

  const [
    users,
    trucks,
    emptyLegs,
    loads,
    bookings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.truck.count(),
    prisma.emptyLeg.count(),
    prisma.load.count(),
    prisma.booking.count(),
  ]);

  console.log("Database connection successful.");
  console.log({
    users,
    trucks,
    emptyLegs,
    loads,
    bookings,
  });
}

main()
  .catch((error) => {
    console.error("Database verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
