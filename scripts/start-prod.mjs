import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ||= "file:./prisma/prod.db";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("npx prisma db push --skip-generate");

const prisma = new PrismaClient();
try {
  const count = await prisma.country.count();
  if (count === 0) {
    run("npm run db:seed");
  }
} finally {
  await prisma.$disconnect();
}

const port = process.env.PORT || "3000";
run(`npx next start -H 0.0.0.0 -p ${port}`);
