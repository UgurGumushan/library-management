/*
  Warnings:

  - You are about to drop the `Return` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Return" DROP CONSTRAINT "Return_bookId_fkey";

-- DropForeignKey
ALTER TABLE "Return" DROP CONSTRAINT "Return_userId_fkey";

-- AlterTable
ALTER TABLE "Borrow" ADD COLUMN     "isReturned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "score" INTEGER;

-- DropTable
DROP TABLE "Return";
