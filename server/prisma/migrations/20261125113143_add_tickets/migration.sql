-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('TASK', 'BUG', 'STORY');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TicketType" NOT NULL DEFAULT 'TASK',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'TODO',
    -- TKT-1 (written by hand; Prisma can't express a column collation): ranks compare byte by
    -- byte, the order fractional-indexing uses, on every server (architecture §10.2).
    "rank" TEXT COLLATE "C" NOT NULL,
    "assigneeId" UUID,
    "reporterId" UUID NOT NULL,
    "dueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_projectId_status_rank_idx" ON "Ticket"("projectId", "status", "rank");

-- CreateIndex
CREATE INDEX "Ticket_projectId_updatedAt_idx" ON "Ticket"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_idx" ON "Ticket"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_projectId_number_key" ON "Ticket"("projectId", "number");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TKT-1: defence in depth (written by hand; Prisma's schema can't express CHECK constraints).
-- The API already enforces both, but the database refuses bad rows from any other path too.
-- Ticket numbers come from Project.ticketCounter, which starts at 0 and is incremented first.
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_number_positive_check" CHECK ("number" >= 1);

-- A title is 1-120 characters (the create-ticket form rule).
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_title_length_check" CHECK (char_length("title") BETWEEN 1 AND 120);
