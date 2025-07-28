-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Section" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deckId" INTEGER NOT NULL,
    "foreignText" TEXT NOT NULL,
    "englishText" TEXT NOT NULL,
    "audioPath" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Section_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Section" ("audioPath", "deckId", "englishText", "foreignText", "id", "position") SELECT "audioPath", "deckId", "englishText", "foreignText", "id", "position" FROM "Section";
DROP TABLE "Section";
ALTER TABLE "new_Section" RENAME TO "Section";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
