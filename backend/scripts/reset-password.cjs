/**
 * SasyaVahini — Secure Password Reset Utility
 *
 * Usage:
 *   node scripts/reset-password.cjs <email> <newPassword>
 *
 * Sets standard bcrypt (12 rounds) hash, sets status to ACTIVE, and isEmailVerified to true.
 * Does not print password hashes or passwords.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: node scripts/reset-password.cjs <email> <newPassword>');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
  });

  if (!user) {
    console.log(`[ERROR] User with email "${normalizedEmail}" not found.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: 'ACTIVE',
      isEmailVerified: true
    }
  });

  console.log(`[SUCCESS] Password successfully reset for user "${user.name}" (${user.email}) [Role: ${user.role}].`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

