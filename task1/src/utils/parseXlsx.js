import * as XLSX from 'xlsx';

/**
 * Parse a single xlsx file buffer into a normalized data object.
 * Headers are in row 2, data starts at row 3.
 * Model name and profile extracted from filename.
 */
export function parseXlsxBuffer(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets['Summary'];

  if (!sheet) {
    throw new Error(`No 'Summary' sheet found in ${filename}`);
  }

  // Get all rows as arrays
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Row 0 = empty, Row 1 = headers, Row 2+ = data
  const headers = rows[1];
  const dataRows = rows.slice(2).filter(row =>
    row.some(cell => cell !== null && cell !== undefined && cell !== '')
  );

  if (!headers || dataRows.length === 0) {
    throw new Error(`Invalid data structure in ${filename}`);
  }

  // Extract model and profile from filename: Model_A_profile_1.xlsx
  const match = filename.match(/Model[_ ]([A-Z]+)[_ ]profile[_ ](\d+)/i);
  if (!match) {
    throw new Error(`Filename does not match expected pattern: ${filename}`);
  }

  const modelName = `Model ${match[1]}`;
  const profileNumber = parseInt(match[2]);

  // Convert rows to objects using headers
  const data = dataRows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? null;
    });
    return obj;
  });

  return {
    modelName,
    modelLetter: match[1],
    profileNumber,
    filename,
    data, // array of row objects, one per batch size
  };
}

/**
 * Fetch and parse a single preloaded xlsx file from public/perf_data/
 */
export async function fetchAndParseXlsx(filename) {
  const response = await fetch(`/perf_data/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return parseXlsxBuffer(new Uint8Array(arrayBuffer), filename);
}

/**
 * Parse an uploaded File object from the browser
 */
export async function parseUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseXlsxBuffer(
          new Uint8Array(e.target.result),
          file.name
        );
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Load all 77 preloaded model sweeps from public/perf_data/
 * Returns array of parsed model data objects
 */
export async function loadAllPreloadedSweeps() {
  const models = ['A','B','C','D','E','F','G','H','I','J','K'];
  const profiles = [1,2,3,4,5,6,7];

  const promises = [];
  for (const model of models) {
    for (const profile of profiles) {
      const filename = `Model_${model}_profile_${profile}.xlsx`;
      promises.push(
        fetchAndParseXlsx(filename).catch(err => {
          console.warn(`Skipping ${filename}:`, err.message);
          return null;
        })
      );
    }
  }

  const results = await Promise.all(promises);
  return results.filter(Boolean);
}
