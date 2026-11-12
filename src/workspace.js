import { assignmentBlockReasons } from './inventory.js';

export const STORAGE_KEY = 'flota-workspace-v1';
export const initialWorkspace = {
  projects: [{ id: 'project-1', name: 'Proyecto 1' }, { id: 'project-2', name: 'Proyecto 2' }, { id: 'project-3', name: 'Proyecto 3' }],
  selected: 'project-1', assignments: {},
};

export function restoreWorkspace(raw, vehicles) {
  if (!raw) return initialWorkspace;
  const saved = JSON.parse(raw);
  if (saved.version !== 1 || !Array.isArray(saved.projects) || !saved.projects.length) throw new Error('Sesión inválida');
  const projectIds = new Set();
  const projects = saved.projects.map((p) => {
    if (typeof p.id !== 'string' || !p.id || projectIds.has(p.id) || typeof p.name !== 'string' || !p.name.trim()) throw new Error('Proyecto inválido');
    projectIds.add(p.id);
    return { id: p.id, name: p.name.trim().slice(0, 60),
      ...(/^bg-[1-5]$/.test(p.scene) ? { scene: p.scene } : {}),
    };
  });
  const vehicleIds = new Set(vehicles.map((v) => v.id));
  const assignments = Object.fromEntries(Object.entries(saved.assignments ?? {}).filter(([id, project]) => vehicleIds.has(id) && projectIds.has(project)));
  return { projects, assignments, selected: projectIds.has(saved.selected) ? saved.selected : projects[0].id };
}

export function workspaceReducer(state, action) {
  switch (action.type) {
    case 'scene': return /^bg-[1-5]$/.test(action.scene)
      ? { ...state, projects: state.projects.map((p) => p.id === action.project ? { ...p, scene: action.scene } : p) } : state;
    case 'select': return state.projects.some((p) => p.id === action.id) ? { ...state, selected: action.id } : state;
    case 'create': return action.name.trim() && !state.projects.some((p) => p.id === action.id)
      ? { ...state, projects: [...state.projects, { id: action.id, name: action.name.trim().slice(0, 60) }], selected: action.id } : state;
    case 'assign': return action.vehicle?.id !== action.id || assignmentBlockReasons(action.vehicle).length > 0
      || state.assignments[action.id] || !state.projects.some((p) => p.id === action.project)
      ? state : { ...state, assignments: { ...state.assignments, [action.id]: action.project } };
    case 'release': {
      const assignments = { ...state.assignments };
      delete assignments[action.id];
      return { ...state, assignments };
    }
    default: return state;
  }
}
