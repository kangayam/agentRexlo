-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by_id" TEXT,
ADD COLUMN     "scheduled_delete_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
