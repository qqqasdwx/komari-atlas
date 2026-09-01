/**
 * 将表示数据大小的字符串（如 '1.5MB', '128*1024gb'）转换为字节数。
 * @param str - 输入的字符串。
 * @returns - 计算出的字节数（number）。如果无法解析，则返回 0。
 * @example
 * stringToBytes('1MB');        // 1048576
 * stringToBytes('1 MB');        // 1048576
 * stringToBytes('5.4MB');      // 5662310
 * stringToBytes('6,222,765 MB'); // 6525042032640
 * stringToBytes('128*1024gb'); // 140737488355328
 * stringToBytes('1e3kb');       // 1024000 (1000 * 1024)
 * stringToBytes('0.2gb');       // 214748365
 * stringToBytes('1024');        // 1024 (默认为字节)
 * stringToBytes('1tb');         // 1099511627776
 */
export function stringToBytes(str: string): number {
  if (typeof str !== "string" || str.length === 0) {
    return 0;
  }
  // 定义单位和它们的字节倍数 (使用 1024 为基数)
  const units: { [key: string]: number } = {
    b: 1,
    byte: 1,
    bytes: 1,
    k: 1024,
    kb: 1024,
    kib: 1024,
    kilobyte: 1024,
    m: 1024 ** 2,
    mb: 1024 ** 2,
    mib: 1024 ** 2,
    megabyte: 1024 ** 2,
    g: 1024 ** 3,
    gb: 1024 ** 3,
    gib: 1024 ** 3,
    gigabyte: 1024 ** 3,
    t: 1024 ** 4,
    tb: 1024 ** 4,
    tib: 1024 ** 4,
    terabyte: 1024 ** 4,
    p: 1024 ** 5,
    pb: 1024 ** 5,
    pib: 1024 ** 5,
    petabyte: 1024 ** 5,
  };

  const cleanStr = str.toLowerCase().replace(/,/g, "").replace(/\s/g, "");
  const unitKeys = Object.keys(units).sort((a, b) => b.length - a.length);
  const numberPattern = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?";
  const expressionPattern = `${numberPattern}(?:\\*${numberPattern})*`;
  const valuePattern = new RegExp(
    `^(${expressionPattern})?(${unitKeys.join("|")})?$`
  );
  const match = cleanStr.match(valuePattern);

  if (!match || (!match[1] && !match[2])) {
    return 0;
  }

  const numericPart = match[1] || "1";
  const unit = match[2] || "b";
  const value = numericPart
    .split("*")
    .map(Number)
    .reduce((product, factor) => product * factor, 1);
  const bytes = value * units[unit];

  return Number.isFinite(bytes) && bytes >= 0 ? Math.round(bytes) : 0;
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    // 单位为B，不显示小数
    return `${Math.round(size)} ${units[unitIndex]}`;
  } else if (unitIndex >= 2 && bytes >= 1024**3) {
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  } else if (size > 99.99) {
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  } else {
    // 小于等于两位数，显示2位小数
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
