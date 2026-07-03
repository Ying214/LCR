export type ExportChartFile = {
  filename: string;
  blob: Blob;
};

const ZIP_CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export function getExportDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildExportFilename(name: string, extension: string, date = new Date()) {
  return `${name}-${getExportDateStamp(date)}.${extension}`;
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadTextFile(content: string, filename: string, type: string) {
  downloadFile(new Blob([content], { type }), filename);
}

export function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = Array.isArray(value) ? value.join("；") : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function findExportChartSvg(container: HTMLElement | null, chartKey: string) {
  return container?.querySelector<SVGSVGElement>(`svg[data-export-chart="${chartKey}"]`) ?? null;
}

function getSvgDimensions(svg: SVGSVGElement) {
  const viewBox = svg.viewBox.baseVal;
  if (viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const rect = svg.getBoundingClientRect();
  return {
    width: Math.max(Math.ceil(rect.width), 1),
    height: Math.max(Math.ceil(rect.height), 1),
  };
}

export async function convertSvgToPngBlob(svg: SVGSVGElement, scale = 2) {
  const { width, height } = getSvgDimensions(svg);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const serializedSvg = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("無法轉換 SVG 圖表。"));
    });
    image.src = svgUrl;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("瀏覽器不支援 Canvas 匯出。");
    }
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) {
      throw new Error("無法產生 PNG 檔案。");
    }
    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function captureExportChartPng(container: HTMLElement | null, chartKey: string) {
  const svg = findExportChartSvg(container, chartKey);
  if (!svg || svg.dataset.exportEmpty === "true") {
    return null;
  }
  return convertSvgToPngBlob(svg);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = ZIP_CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function getZipDateTime(date = new Date()) {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

export async function createZipBlob(files: ExportChartFile[]) {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  const { dosTime, dosDate } = getZipDateTime();
  let offset = 0;

  for (const file of files) {
    const filenameBytes = encoder.encode(file.filename);
    const dataBytes = new Uint8Array(await file.blob.arrayBuffer());
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + filenameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, dosTime);
    writeUint16(localHeader, 12, dosDate);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, dataBytes.length);
    writeUint32(localHeader, 22, dataBytes.length);
    writeUint16(localHeader, 26, filenameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(filenameBytes, 30);
    localChunks.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, dosTime);
    writeUint16(centralHeader, 14, dosDate);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, dataBytes.length);
    writeUint32(centralHeader, 24, dataBytes.length);
    writeUint16(centralHeader, 28, filenameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(filenameBytes, 46);
    centralChunks.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralChunks);
  const localDirectory = concatBytes(localChunks);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 4, 0);
  writeUint16(endRecord, 6, 0);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, localDirectory.length);
  writeUint16(endRecord, 20, 0);

  return new Blob([localDirectory, centralDirectory, endRecord], { type: "application/zip" });
}
