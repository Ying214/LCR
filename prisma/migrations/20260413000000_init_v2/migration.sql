-- CreateTable
CREATE TABLE "BaselineProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "conditionLabel" TEXT,
    "freqHz" REAL,
    "level" REAL,
    "rp" REAL,
    "cp" REAL,
    "rs" REAL,
    "cs" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MeasurementDataset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasetName" TEXT NOT NULL,
    "conditionLabel" TEXT NOT NULL,
    "note" TEXT,
    "baselineId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeasurementDataset_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "BaselineProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeasurementRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasetId" TEXT NOT NULL,
    "indexNo" INTEGER NOT NULL,
    "freqHz" REAL NOT NULL,
    "level" REAL NOT NULL,
    "rp" REAL NOT NULL,
    "cp" REAL NOT NULL,
    "rs" REAL NOT NULL,
    "cs" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "MeasurementDataset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MeasurementRecord_datasetId_indexNo_key" ON "MeasurementRecord"("datasetId", "indexNo");
