/*
  Warnings:

  - Added the required column `languageCode` to the `Deck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `languageName` to the `Deck` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "languageCode" TEXT NOT NULL,
    "languageName" TEXT NOT NULL
);
INSERT INTO "new_Deck" ("description", "id", "name", "playCount") SELECT "description", "id", "name", "playCount" FROM "Deck";
DROP TABLE "Deck";
ALTER TABLE "new_Deck" RENAME TO "Deck";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
