import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { assignmentBlockReasons, groupVehicles, parseInventory } from '../src/inventory.js';
import { initialWorkspace, restoreWorkspace, workspaceReducer } from '../src/workspace.js';

const csv = readFileSync(new URL('../Inventario.csv', import.meta.url), 'utf8');
const vehicles = parseInventory(csv);

test('loads all 81 unique vehicles and resolves every original image', () => {
  assert.equal(vehicles.length, 81);
  assert.equal(new Set(vehicles.map((v) => v.id)).size, 81);
  for (const vehicle of vehicles) assert.ok(existsSync(new URL(`../img/cars/${vehicle.asset}`, import.meta.url)));
});
test('groups CSV variants without inventing vehicles', () => {
  const counts = Object.fromEntries(groupVehicles(vehicles).map((g) => [g.name, g.vehicles.length]));
  assert.deepEqual(counts, { 'Chevrolet Aveo': 32, 'Chevrolet Silverado 1500': 1, 'JAC Frison': 5, 'Mitsubishi L200': 4, 'Nissan Frontier': 2, 'Nissan NP 300': 17, 'Nissan Tsuru': 2, 'Nissan V-Drive': 1, 'RAM 4000': 1, 'RAM 700': 16 });
});
test('orders by condition and supports plate, model, ID and condition search', () => {
  const aveos = groupVehicles(vehicles, 'aveo')[0].vehicles;
  const ranks = { BUENO: 0, REGULAR: 1, MALO: 2 };
  assert.ok(aveos.every((v, i) => i === 0 || ranks[v.condition] >= ranks[aveos[i - 1].condition]));
  assert.equal(groupVehicles(vehicles, vehicles[0].plate.toLowerCase())[0].vehicles[0].id, vehicles[0].id);
  assert.equal(groupVehicles(vehicles, vehicles[0].id)[0].vehicles.length, 1);
  assert.equal(groupVehicles(vehicles, '', 'BUENO').flatMap((g) => g.vehicles).length, 14);
  assert.equal(groupVehicles(vehicles, 'does-not-exist').length, 0);
});
test('rejects missing headers and duplicate vehicle IDs', () => {
  assert.throws(() => parseInventory('name,plate\ncar,ABC'));
  const rows = csv.trim().split(/\r?\n/);
  assert.throws(() => parseInventory([rows[0], rows[1], rows[1]].join('\n')));
});
test('exclusive assignment, project switching, cancellation and persistence', () => {
  const vehicle = vehicles.find((v) => v.condition === 'REGULAR' && v.operation === 'EN ACTIVO');
  const id = vehicle.id;
  let state = workspaceReducer(initialWorkspace, { type: 'assign', id, vehicle, project: 'project-1' });
  state = workspaceReducer(state, { type: 'assign', id, vehicle, project: 'project-2' });
  assert.equal(state.assignments[id], 'project-1');
  state = workspaceReducer(state, { type: 'create', id: 'regional', name: ' Regional ' });
  assert.equal(state.selected, 'regional');
  assert.equal(state.projects.at(-1).name, 'Regional');
  assert.deepEqual(restoreWorkspace(JSON.stringify({ version: 1, ...state }), vehicles), state);
  state = workspaceReducer(state, { type: 'release', id });
  assert.equal(Object.keys(state.assignments).length, 0);
});

test('blocks bad condition independently from maintenance, retirement or unknown operation', () => {
  const examples = ['USF282R', 'USF283R', 'URZ982K'];
  for (const plate of examples) {
    const vehicle = vehicles.find((v) => v.plate === plate);
    assert.ok(assignmentBlockReasons(vehicle).length);
    assert.equal(workspaceReducer(initialWorkspace, { type: 'assign', id: vehicle.id, vehicle, project: 'project-1' }), initialWorkspace);
  }
  const good = vehicles.find((v) => v.condition === 'BUENO' && v.operation === 'EN ACTIVO');
  assert.deepEqual(assignmentBlockReasons(good), []);
  assert.ok(assignmentBlockReasons({ ...good, operation: 'DESCONOCIDO' }).length);
  assert.equal(workspaceReducer(initialWorkspace, { type: 'assign', id: good.id, project: 'project-1' }), initialWorkspace);
});
test('restoration removes stale assignments and rejects malformed sessions', () => {
  const raw = { version: 1, ...initialWorkspace, selected: 'missing', assignments: { missing: 'project-1', [vehicles[0].id]: 'deleted' } };
  assert.deepEqual(restoreWorkspace(JSON.stringify(raw), vehicles), initialWorkspace);
  assert.throws(() => restoreWorkspace('{broken', vehicles));
  assert.throws(() => restoreWorkspace(JSON.stringify({ version: 1, projects: [] }), vehicles));
});

test('preserves existing workspaces and stores a separate scene for each project', () => {
  const state = workspaceReducer(initialWorkspace, { type: 'scene', project: 'project-1', scene: 'bg-3' });
  assert.equal(state.projects[0].scene, 'bg-3');
  assert.equal(state.projects[1].scene, undefined);
  assert.deepEqual(restoreWorkspace(JSON.stringify({ version: 1, ...state }), vehicles), state);
  assert.deepEqual(workspaceReducer(state, { type: 'scene', project: 'project-1', scene: 'unknown' }), state);
});
