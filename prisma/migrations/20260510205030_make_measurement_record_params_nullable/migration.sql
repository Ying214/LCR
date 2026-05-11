-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MeasurementRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasetId" TEXT NOT NULL,
    "indexNo" INTEGER NOT NULL,
    "freqHz" REAL NOT NULL,
    "level" REAL NOT NULL,
    "rp" REAL,
    "cp" REAL,
    "rs" REAL,
    "cs" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "MeasurementDataset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MeasurementRecord" ("cp", "createdAt", "cs", "datasetId", "freqHz", "id", "indexNo", "level", "rp", "rs") SELECT "cp", "createdAt", "cs", "datasetId", "freqHz", "id", "indexNo", "level", "rp", "rs" FROM "MeasurementRecord";
DROP TABLE "MeasurementRecord";
ALTER TABLE "new_MeasurementRecord" RENAME TO "MeasurementRecord";
CREATE UNIQUE INDEX "MeasurementRecord_datasetId_indexNo_key" ON "MeasurementRecord"("datasetId", "indexNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
