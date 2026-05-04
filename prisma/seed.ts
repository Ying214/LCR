import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.measurementRecord.deleteMany();
  await prisma.measurementDataset.deleteMany();
  await prisma.baselineProfile.deleteMany();

  const baselineA = await prisma.baselineProfile.create({
    data: {
      name: "基準 A",
      conditionLabel: "未製程前",
      freqHz: 10000,
      level: 2,
      rp: 1015,
      cp: 1.61e-9,
      rs: 199,
      cs: 1.02e-9,
      note: "10kHz 基準",
    },
  });

  const baselineB = await prisma.baselineProfile.create({
    data: {
      name: "基準 B",
      conditionLabel: "未製程前",
      freqHz: 40000,
      level: 2,
      rp: 952,
      cp: 1.39e-9,
      rs: 190,
      cs: 0.93e-9,
      note: "40kHz 基準",
    },
  });

  await prisma.measurementDataset.create({
    data: {
      datasetName: "石墨晶舟批次 A",
      conditionLabel: "常溫製程後",
      note: "示範資料",
      baselineId: baselineA.id,
      records: {
        create: [
          { indexNo: 1, freqHz: 10000, level: 2, rp: 1065, cp: 1.52e-9, rs: 205, cs: 0.98e-9 },
          { indexNo: 2, freqHz: 10000, level: 2, rp: 1080, cp: 1.5e-9, rs: 208, cs: 0.97e-9 },
          { indexNo: 3, freqHz: 10000, level: 2, rp: 1072, cp: 1.49e-9, rs: 206, cs: 0.96e-9 },
        ],
      },
    },
  });

  await prisma.measurementDataset.create({
    data: {
      datasetName: "石墨晶舟批次 A",
      conditionLabel: "300°C 製程後",
      note: "示範資料",
      baselineId: baselineB.id,
      records: {
        create: [
          { indexNo: 1, freqHz: 40000, level: 2, rp: 1088, cp: 1.19e-9, rs: 210, cs: 0.81e-9 },
          { indexNo: 2, freqHz: 40000, level: 2, rp: 1102, cp: 1.17e-9, rs: 212, cs: 0.8e-9 },
          { indexNo: 3, freqHz: 40000, level: 2, rp: 1095, cp: 1.18e-9, rs: 211, cs: 0.8e-9 },
        ],
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
