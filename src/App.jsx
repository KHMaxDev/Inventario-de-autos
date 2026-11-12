import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, rectIntersection } from '@dnd-kit/core';
import { ArrowLeft, CarFront, Check, ChevronDown, ChevronRight, CircleHelp, Folder, Info, Layers3, Move, PanelLeftClose, PanelLeftOpen, Plus, Search, X } from 'lucide-react';
import csv from '../Inventario.csv?raw';
import { assignmentBlockReasons, groupVehicles, parseInventory } from './inventory.js';
import { initialWorkspace, restoreWorkspace, STORAGE_KEY, workspaceReducer } from './workspace.js';
import { carImage } from './assets.js';
import VehicleScene, { Condition, operationNames } from './components/VehicleScene.jsx';
import InformationDialog from './components/InformationDialog.jsx';
import AssignmentDialog from './components/AssignmentDialog.jsx';

let vehicles = [], dataError = '';
try { vehicles = parseInventory(csv); } catch (error) { dataError = error.message; }

function VehicleCard({ vehicle, selected, pending = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: vehicle.id, disabled: pending });
  return <button ref={setNodeRef} {...attributes} {...listeners} className={`vehicle-card draggable-card ${selected ? 'selected' : ''} ${isDragging ? 'drag-origin' : ''} ${pending ? 'pending-card' : ''}`} data-vehicle={vehicle.id} aria-label={`Arrastrar ${vehicle.plate}`} disabled={pending}>
    <span className="vehicle-select">
      <span className="catalog-car"><img src={carImage(vehicle)} alt="" draggable="false" loading="lazy" /></span>
      <span className="catalog-data"><strong>{vehicle.plate}<span>{vehicle.year}</span></strong><small>{operationNames[vehicle.operation] ?? vehicle.operation}</small><Condition value={vehicle.condition} /></span>
      {selected && <span className="selection-notch"><ChevronRight size={14} /></span>}
    </span>
  </button>;
}

// Keep the overlay out of dnd-kit's draggable registry to preserve the source node.
function FloatingVehicle({ vehicle }) {
  return <article className="vehicle-card floating-card" aria-hidden="true"><div className="vehicle-select"><span className="catalog-car"><img src={carImage(vehicle)} alt="" draggable="false" /></span><span className="catalog-data"><strong>{vehicle.plate}<span>{vehicle.year}</span></strong><small>{operationNames[vehicle.operation]}</small><Condition value={vehicle.condition} /></span></div></article>;
}

function ProjectDialog({ onClose, onCreate }) {
  const ref = useRef(null);
  const [name, setName] = useState('');
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="project-dialog" onCancel={onClose} aria-labelledby="dialog-title"><form onSubmit={(event) => { event.preventDefault(); if (name.trim()) onCreate(name); }}>
    <div className="dialog-heading"><h2 id="dialog-title">Nuevo proyecto</h2><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={20} /></button></div>
    <label htmlFor="project-name">Nombre del proyecto</label><input id="project-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus placeholder="Ej. Playa Censo" />
    <p>Un nuevo escenario para los vehículos de tu equipo.</p><button className="primary-button" disabled={!name.trim()}>Crear proyecto<Plus size={17} /></button>
  </form></dialog>;
}

export default function App() {
  const [storageError, setStorageError] = useState('');
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => {
    try { return restoreWorkspace(localStorage.getItem(STORAGE_KEY), vehicles); } catch { return initialWorkspace; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [condition, setCondition] = useState('TODOS');
  const [openGroups, setOpenGroups] = useState(['Chevrolet Aveo']);
  const [closedFilteredGroups, setClosedFilteredGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [pending, setPending] = useState([]);
  const [selection, setSelection] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [info, setInfo] = useState(null);
  const [assignmentAction, setAssignmentAction] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState('');
  const newProjectButton = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  useEffect(() => { setClosedFilteredGroups([]); }, [query, condition]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state })); setStorageError(''); }
    catch { setStorageError('No se pudo guardar en este navegador. Los cambios durarán hasta cerrar o recargar.'); }
  }, [state]);
  useEffect(() => {
    if (!pending.length) return;
    const timeout = setTimeout(() => setPending([]), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000);
    return () => clearTimeout(timeout);
  }, [pending]);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timeout);
  }, [message]);

  const project = state.projects.find((p) => p.id === state.selected);
  const available = useMemo(() => vehicles.filter((v) => !state.assignments[v.id]), [state.assignments]);
  const catalog = useMemo(() => vehicles.filter((v) => !state.assignments[v.id] || pending.includes(v.id)), [state.assignments, pending]);
  const groups = useMemo(() => groupVehicles(catalog, query, condition), [catalog, query, condition]);
  const assigned = vehicles.filter((v) => state.assignments[v.id] === project.id);
  const selectedVehicle = vehicles.find((v) => selection?.project === project.id && v.id === selection.id && (!state.assignments[v.id] || state.assignments[v.id] === project.id))
    ?? assigned[0];

  function select(vehicle) { setSelection({ id: vehicle.id, project: project.id }); }
  function requestAssignment(vehicle) {
    if (state.assignments[vehicle.id]) return;
    const reasons = assignmentBlockReasons(vehicle);
    setAssignmentAction({ type: reasons.length ? 'blocked' : 'assign', vehicle, project, reasons });
  }
  function requestRelease(vehicle) {
    setAssignmentAction({ type: 'release', vehicle, project });
  }
  function confirmAssignmentAction() {
    if (!assignmentAction || assignmentAction.type === 'blocked') return;
    const { vehicle, project: target, type } = assignmentAction;
    if (type === 'assign') {
      const reasons = assignmentBlockReasons(vehicle);
      if (reasons.length) { setAssignmentAction({ ...assignmentAction, type: 'blocked', reasons }); return; }
      if (state.assignments[vehicle.id] || !state.projects.some((p) => p.id === target.id)) { setAssignmentAction(null); return; }
      dispatch({ type: 'assign', id: vehicle.id, vehicle, project: target.id });
      setSelection({ id: vehicle.id, project: target.id });
      setPending((previous) => [...previous, vehicle.id]);
      setMessage(`${vehicle.plate} asignado a ${target.name}.`);
    } else if (state.assignments[vehicle.id] === target.id) {
      dispatch({ type: 'release', id: vehicle.id });
      setSelection(null);
      setPending((previous) => previous.filter((id) => id !== vehicle.id));
      setMessage(`${vehicle.plate} retirado de ${target.name} y devuelto al inventario.`);
    }
    setAssignmentAction(null);
  }
  function closeDialog() { setShowDialog(false); newProjectButton.current?.focus(); }
  function toggleGroup(name, filtered) {
    const toggle = (previous) => previous.includes(name) ? previous.filter((item) => item !== name) : [...previous, name];
    if (filtered) setClosedFilteredGroups(toggle); else setOpenGroups(toggle);
  }
  if (dataError) return <main className="data-error"><h1>No se pudo cargar el inventario</h1><p>{dataError}</p><p>Revisa Inventario.csv y vuelve a iniciar la aplicación.</p></main>;

  return <DndContext sensors={sensors} collisionDetection={rectIntersection}
    onDragStart={({ active: item }) => { const vehicle = vehicles.find((v) => v.id === item.id); setActive(vehicle); select(vehicle); }}
    onDragCancel={() => setActive(null)}
    onDragEnd={({ active: item, over }) => { if (over?.id === 'showroom') { const vehicle = vehicles.find((v) => v.id === item.id); if (vehicle) requestAssignment(vehicle); } setActive(null); }}
    accessibility={{ screenReaderInstructions: { draggable: 'Pulsa espacio para levantar y previsualizar el vehículo. Usa las flechas para moverlo al proyecto y espacio para soltar. Después confirma la asignación en el diálogo. Escape cancela el arrastre.' }, announcements: {
      onDragStart: () => 'Vehículo levantado. Vista previa activada.', onDragOver: ({ over }) => over ? 'Sobre el proyecto. Suelta para revisar la asignación.' : 'Fuera del proyecto.',
      onDragEnd: ({ over }) => over ? 'Revisa el aviso antes de asignar la unidad.' : 'Vehículo sin asignar.', onDragCancel: () => 'Arrastre cancelado. La vista previa sigue disponible.',
    } }}>
    <a className="skip-link" href="#workspace">Ir al proyecto</a>
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Proyectos">
        <a className="brand" href="./" aria-label="Flota, inicio"><span className="brand-icon"><CarFront size={25} /></span><span className="sidebar-copy">flota<span className="brand-dot">.</span></span></a>
        <div className="sidebar-section-heading"><span className="sidebar-copy">Espacio de trabajo</span><button className="icon-button collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir proyectos' : 'Compactar proyectos'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>
        <div className="projects-heading sidebar-copy"><h2>Mis proyectos</h2><span>{state.projects.length}</span></div>
        <nav className="projects-list">{state.projects.map((p, index) => {
          const count = Object.values(state.assignments).filter((id) => id === p.id).length;
          return <button key={p.id} className={`project-button ${state.selected === p.id ? 'selected' : ''}`} onClick={() => dispatch({ type: 'select', id: p.id })} aria-current={state.selected === p.id ? 'page' : undefined} title={p.name} aria-label={`${p.name}, ${count} vehículos`}><span className="project-icon"><Folder size={18} /><small>{index + 1}</small></span><span className="sidebar-copy project-name">{p.name}</span><span className="sidebar-copy project-count">{count}</span></button>;
        })}</nav>
        <button className="new-project" ref={newProjectButton} onClick={() => setShowDialog(true)} aria-label="Nuevo proyecto"><Plus size={17} /><span className="sidebar-copy">Nuevo proyecto</span></button>
        <button className="project-info-link" onClick={() => setInfo('project')} aria-label="Información del proyecto"><Info size={17} /><span className="sidebar-copy">Información del proyecto</span></button>
        <div className="sidebar-bottom"><div className="sidebar-tip sidebar-copy"><span className="tip-icon"><Layers3 size={21} /></span><h3>Cada unidad, un destino.</h3><p>Elige un proyecto y dale un lugar a tu flota.</p><span className="tip-line" /></div><button className="help-button" onClick={() => setShowHelp(!showHelp)} aria-expanded={showHelp} aria-label="Cómo funciona"><CircleHelp size={18} /><span className="sidebar-copy">Cómo funciona</span></button><div className="profile"><span className="avatar">AF</span><div className="sidebar-copy"><strong>Administración de flota</strong><small>Espacio local</small></div></div></div>
      </aside>

      <main className="workspace-main" id="workspace">
        <header className="workspace-heading"><div><p className="breadcrumb">Proyectos<ChevronRight size={13} /><span>{project.name}</span></p><h1>{project.name}</h1></div><button className="project-mark icon-button" aria-label="Ver detalles del proyecto" onClick={() => setInfo('project')}><Folder size={24} /></button></header>
        {storageError && <p className="storage-error" role="alert">{storageError}</p>}
        {showHelp && <section className="help-panel"><div><h2>Tu flota entra en escena</h2><p>Arrastra desde cualquier parte de una tarjeta para previsualizar la unidad. Suéltala en el escenario y confirma para asignarla. Las unidades en estado malo, en mantenimiento o para baja solo se pueden previsualizar.</p><p>Con teclado: enfoca la tarjeta, espacio levanta, las flechas mueven y espacio suelta. Escape cancela. La X roja solicita confirmación para retirar una unidad del proyecto.</p></div><button className="icon-button" onClick={() => setShowHelp(false)} aria-label="Cerrar ayuda"><X size={18} /></button></section>}
        <VehicleScene key={project.id} project={project} vehicle={selectedVehicle} assigned={assigned} onSelect={select} onRelease={requestRelease} onSceneChange={(scene) => dispatch({ type: 'scene', project: project.id, scene })} onInfo={setInfo} pending={pending} dragging={Boolean(active)} />
        <footer className="workspace-footer"><span className="save-status"><span />{storageError ? 'Sin guardar' : 'Guardado en este navegador'}</span><span>Un vehículo, un proyecto a la vez</span></footer>
      </main>

      <aside className="inventory" aria-label="Inventario disponible">
        <section className="stats" aria-label="Resumen de inventario"><div><strong>{vehicles.length}</strong><span>Unidades totales</span></div><div><strong>{available.length}</strong><span>Sin asignar</span></div><div><strong>{Object.keys(state.assignments).length}</strong><span>Asignadas</span></div></section>
        <div className="inventory-tools"><div className="inventory-heading"><div><h2>Inventario</h2><p>Elige tu próxima unidad.</p></div><span className="inventory-count">{available.length}</span></div>
          <label className="search-field"><Search size={17} /><span className="sr-only">Buscar vehículo</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Modelo, placa o inventario" />{query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}</label>
          <div className="filter-row"><label htmlFor="condition-filter">Estado</label><select id="condition-filter" value={condition} onChange={(e) => setCondition(e.target.value)}><option value="TODOS">Todos los estados</option><option value="BUENO">Bueno</option><option value="REGULAR">Regular</option><option value="MALO">Malo</option></select></div>
          <div className="inventory-caption"><span>Marca / modelo</span><span>Bueno → Malo</span></div>
        </div>
        <div className="inventory-groups">{groups.length ? groups.map((group) => {
          const filtered = Boolean(query) || condition !== 'TODOS';
          const open = filtered ? !closedFilteredGroups.includes(group.name) : openGroups.includes(group.name);
          const groupId = `group-${group.name.replaceAll(' ', '-')}`;
          return <section className="model-group" key={group.name}><button className={`group-toggle ${open ? 'open' : ''}`} aria-expanded={open} aria-controls={groupId} onClick={() => toggleGroup(group.name, filtered)}><img src={carImage(group.vehicles[0])} alt="" /><span>{group.name}</span><span className="group-count">{group.vehicles.length}</span><ChevronDown size={15} /></button><div id={groupId} hidden={!open} className="vehicle-grid">{open && group.vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} selected={selectedVehicle?.id === v.id} pending={pending.includes(v.id)} />)}</div></section>;
        }) : <div className="no-results"><Search size={28} /><h3>{available.length ? 'Sin coincidencias' : 'Todo tiene un destino'}</h3><p>{available.length ? 'Prueba otra placa, modelo o estado.' : 'Los vehículos están asignados a tus proyectos.'}</p>{available.length > 0 && <button onClick={() => { setQuery(''); setCondition('TODOS'); }}><ArrowLeft size={15} />Limpiar filtros</button>}</div>}</div>
        <div className="inventory-footer"><Move size={14} /><span>Arrastra para previsualizar. Suelta para asignar.</span></div>
      </aside>
    </div>
    <div className={`toast ${message ? 'visible' : ''}`} role="status" aria-live="polite">{message && <><Check size={17} />{message}</>}</div>
    <DragOverlay dropAnimation={null}>{active ? <FloatingVehicle vehicle={active} /> : null}</DragOverlay>
    {showDialog && <ProjectDialog onClose={closeDialog} onCreate={(name) => { dispatch({ type: 'create', id: crypto.randomUUID(), name }); closeDialog(); setMessage(`Proyecto ${name.trim()} creado.`); }} />}
    {info && <InformationDialog mode={info} vehicle={selectedVehicle} project={project} assigned={assigned} onClose={() => setInfo(null)} />}
    {assignmentAction && <AssignmentDialog action={assignmentAction} onCancel={() => setAssignmentAction(null)} onConfirm={confirmAssignmentAction} />}
  </DndContext>;
}
