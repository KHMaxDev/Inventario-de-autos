import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CarFront, Folder, X } from 'lucide-react';
import { carImage } from '../assets.js';
import { assignmentBlockReasons } from '../inventory.js';
import { Condition, operationNames } from './VehicleScene.jsx';

export default function InformationDialog({ mode, vehicle, project, assigned, onClose }) {
  const root = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = root.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from(root.current, { x: 30, opacity: 0, duration: 0.35, ease: 'power3.out' });
  }, { scope: root });
  const belongs = assigned.some((item) => item.id === vehicle?.id);
  const blocked = assignmentBlockReasons(vehicle).length > 0;
  const fields = vehicle ? [
    ['Inventario', vehicle.id], ['Número de serie', vehicle.serial], ['Marca', vehicle.brand],
    ['Modelo / versión', vehicle.variant], ['Año', vehicle.year], ['Placa', vehicle.plate],
    ['Color', vehicle.color], ['Motor', vehicle.engine], ['Cilindros', vehicle.cylinders],
    ['Estado operativo', operationNames[vehicle.operation]], ['Clasificación', vehicle.classification],
    ['Inventario de caseta', vehicle.boothInventory || 'No registrado'], ['Descripción', vehicle.description],
  ] : [];
  return <dialog className="information-dialog" ref={root} onCancel={onClose} aria-labelledby="info-title"><div className="info-top"><span>{mode === 'vehicle' ? <CarFront size={18} /> : <Folder size={18} />}{mode === 'vehicle' ? 'Expediente de unidad' : 'Espacio de trabajo'}</span><button className="icon-button" onClick={onClose} aria-label="Cerrar información"><X size={20} /></button></div>
    {mode === 'vehicle' && vehicle ? <><div className="info-vehicle"><img src={carImage(vehicle)} alt={vehicle.model} /><Condition value={vehicle.condition} /></div><h2 id="info-title">{vehicle.model} <span>{vehicle.year}</span></h2><dl className="info-fields">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'No registrado'}</dd></div>)}</dl><section className="info-project"><h3><Folder size={17} />Proyecto asignado</h3>{belongs ? <><strong>{project.name}</strong><p>{assigned.length} unidades en este proyecto. Las asignaciones se guardan en este navegador.</p></> : <><strong>Sin asignar</strong><p>{blocked ? 'Esta unidad solo permite vista previa: su condición o estado operativo impide asignarla.' : 'Arrastra esta unidad al escenario y confirma para asignarla al proyecto.'}</p></>}</section></> : <><h2 id="info-title">{project.name}</h2><p className="info-intro">Información del proyecto y sus unidades.</p><div className="project-summary"><strong>{assigned.length}<span>Unidades asignadas</span></strong><strong>{assigned.filter((v) => v.operation === 'EN ACTIVO').length}<span>En activo</span></strong></div><dl className="info-fields"><div><dt>Identificador</dt><dd>{project.id}</dd></div><div><dt>Estado del espacio</dt><dd>Guardado localmente en este navegador</dd></div></dl><h3 className="info-list-title">Unidades del proyecto</h3>{assigned.length ? <ul className="info-assigned-list">{assigned.map((v) => <li key={v.id}><img src={carImage(v)} alt="" /><span><strong>{v.model}</strong><small>{v.plate} · {v.year}</small></span><Condition value={v.condition} /></li>)}</ul> : <p className="info-intro">Todavía no hay vehículos asignados.</p>}</>}
  </dialog>;
}

