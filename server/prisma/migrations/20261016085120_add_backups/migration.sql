-- CreateTable
CREATE TABLE "backups" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_backup_id" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "app_version" TEXT,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backups_user_id_created_at_idx" ON "backups"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "backups_user_id_client_backup_id_key" ON "backups"("user_id", "client_backup_id");

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
