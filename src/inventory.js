import Papa from 'papaparse';

export const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
export const CONDITION_ORDER = { BUENO: 0, REGULAR: 1, MALO: 2 };

// Only explicitly active units in good or regular condition may be assigned.
export function assignmentBlockReasons(vehicle) {
  if (!vehicle) return ['No se encontró la información del vehículo.'];
  const reasons = [];
  if (vehicle.condition === 'MALO') reasons.push('El vehículo está en estado malo.');
  else if (!['BUENO', 'REGULAR'].includes(vehicle.condition)) reasons.push('No se ha confirmado el estado del vehículo.');
  if (vehicle.operation !== 'EN ACTIVO') {
    const operations = { 'EN SERVICIO DE MANTENIMIENTO': 'en mantenimiento', 'PARA BAJA POR ENAJENACION': 'para baja por enajenación' };
    reasons.push(`Su estado operativo es ${operations[vehicle.operation] ?? 'desconocido o no activo'}.`);
  }
  return reasons;
}
export const MODEL_ASSETS = {
  'Chevrolet Aveo': 'Chevrolet2020.png',
  'Chevrolet Silverado 1500': 'ChevroletSilverado1500.png',
  'Nissan NP 300': 'NissanNP3000.png',
  'Nissan Frontier': 'NissanFrontier.png',
  'Nissan Tsuru': 'Tsuru2015.png',
  'Nissan V-Drive': 'NissanVDrive.png',
  'RAM 700': 'Ram700.png',
  'RAM 4000': 'Ram4000.png',
  'Mitsubishi L200': 'Mitsubishi.png',
  'JAC Frison': 'JAC Frison.png',
};

function modelName(brand, model) {
  if (brand === 'CHEVROLET') return model === 'AVEO' ? 'Chevrolet Aveo' : 'Chevrolet Silverado 1500';
  if (brand === 'NISSAN') {
    if (model.replaceAll(' ', '').startsWith('NP300')) return 'Nissan NP 300';
    if (model.startsWith('FRONTIER')) return 'Nissan Frontier';
    return model === 'TSURU' ? 'Nissan Tsuru' : 'Nissan V-Drive';
  }
  if (brand === 'RAM') return model.includes('700') ? 'RAM 700' : 'RAM 4000';
  if (brand === 'MITSUBISHI') return 'Mitsubishi L200';
  if (model.includes('FRISON')) return 'JAC Frison';
  throw new Error(`Modelo sin imagen: ${brand} ${model}`);
}

export function parseInventory(csv) {
  const parsed = Papa.parse(csv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() });
  if (parsed.errors.length) throw new Error('El archivo de inventario tiene filas inválidas.');
  const required = ['No. INVENTARIO', 'No. SERIE', 'MARCA', 'SUBMARCA', 'MOD.', 'PLACAS', 'ESTADO', 'ESTADO OPERACIÓN'];
  if (required.some((field) => !parsed.meta.fields?.includes(field))) throw new Error('Faltan columnas en el inventario.');
  const ids = new Set();
  return parsed.data.map((row) => {
    const id = row['No. INVENTARIO'].trim();
    if (!id || ids.has(id)) throw new Error('Hay identificadores vacíos o duplicados en el inventario.');
    ids.add(id);
    const model = modelName(normalize(row.MARCA), normalize(row.SUBMARCA));
    const condition = normalize(row.ESTADO);
    if (!(condition in CONDITION_ORDER)) throw new Error(`Estado desconocido: ${row.ESTADO}`);
    return {
      id, model, variant: row.SUBMARCA, brand: row.MARCA,
      year: row['MOD.'], plate: row.PLACAS, color: row.COLOR,
      serial: row['No. SERIE'], description: row['DESCRIPCIÓN'],
      engine: row['No. MOTOR'], cylinders: row.CILINDROS,
      classification: row['CLASIFICACIÓN'], boothInventory: row['No. INVENTARIO CASETA'],
      condition, operation: normalize(row['ESTADO OPERACIÓN']), asset: MODEL_ASSETS[model],
    };
  });
}

export function groupVehicles(vehicles, query = '', condition = 'TODOS') {
  const needle = normalize(query);
  const filtered = vehicles.filter((v) => (condition === 'TODOS' || v.condition === condition)
    && normalize(`${v.model} ${v.variant} ${v.plate} ${v.id} ${v.year}`).includes(needle));
  return Object.entries(Object.groupBy(filtered, (v) => v.model))
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([name, items]) => ({ name, vehicles: items.sort((a, b) => CONDITION_ORDER[a.condition] - CONDITION_ORDER[b.condition] || a.plate.localeCompare(b.plate)) }));
}
