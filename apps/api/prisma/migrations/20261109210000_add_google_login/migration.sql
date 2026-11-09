-- AlterTable
ALTER TABLE "user_account" ADD COLUMN "google_subject" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_google_subject_key" ON "user_account"("google_subject");
