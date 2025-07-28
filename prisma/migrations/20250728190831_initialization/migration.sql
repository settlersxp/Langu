-- CreateTable
CREATE TABLE "Deck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Section" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deckId" INTEGER NOT NULL,
    "foreignText" TEXT NOT NULL,
    "englishText" TEXT NOT NULL,
    "audioPath" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "Section_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
