import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowDownLeft, CarFront, Check, ChevronDown, ChevronLeft, ChevronRight, Image, Info, Layers3, Palette, Pause, Play, Plus, ScanLine, ShieldCheck, X } from 'lucide-react';
import { carImage, pineImage, SCENES } from '../assets.js';

gsap.registerPlugin(useGSAP);
export const conditionNames = { BUENO: 'Bueno', REGULAR: 'Regular', MALO: 'Malo' };
export const operationNames = { 'EN ACTIVO': 'En activo', 'EN SERVICIO DE MANTENIMIENTO': 'En mantenimiento', 'PARA BAJA POR ENAJENACION': 'Para baja' };

export function Condition({ value }) {
  return <span className={`condition ${value.toLowerCase()}`}><span />{conditionNames[value]}</span>;
}

function PaperVehicle({ vehicle, arrival, motion }) {
  const root = useRef(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (!motion) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.vehicle-entrance', {
        rotationX: arrival ? -86 : 0, rotationZ: arrival ? -8 : -2,
        y: arrival ? 42 : 18, opacity: 0, scale: arrival ? 0.78 : 0.95,
      }, { rotationX: 0, rotationZ: 0, y: 0, opacity: 1, scale: 1,
        duration: arrival ? 0.85 : 0.5, ease: arrival ? 'back.out(1.25)' : 'power3.out' }, 0)
        .fromTo('.contact-shadow', { scaleX: 0.45, opacity: 0 }, { scaleX: 1, opacity: 0.65, duration: 0.6 }, 0.12)
        .fromTo('.landing-ring', { scale: 0.5, opacity: arrival ? 0.65 : 0 }, { scale: 1.45, opacity: 0, duration: 0.85 }, 0.1);
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [vehicle.id, motion], revertOnUpdate: true });
  return <div className="vehicle-depth" ref={root}>
    <div className="contact-shadow" />
    <div className="landing-ring" />
    <div className="vehicle-sway"><div className="vehicle-entrance"><img className="hero-vehicle" src={carImage(vehicle)} alt={`${vehicle.model}, ${vehicle.year}, placa ${vehicle.plate}`} draggable="false" /></div></div>
  </div>;
}

export default function VehicleScene({ project, vehicle, assigned, onSelect, onRelease, onSceneChange, onInfo, pending, dragging }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'showroom' });
  const root = useRef(null);
  const [picker, setPicker] = useState(false);
  const pickerButton = useRef(null);
  const [motion, setMotion] = useState(true);
  const scene = SCENES.find((item) => item.id === project.scene) ?? SCENES[0];
  const isAssigned = assigned.some((item) => item.id === vehicle?.id);
  const index = assigned.findIndex((item) => item.id === vehicle?.id);

  // Separate camera, world and vehicle wrappers keep idle and pointer tweens from competing.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (!motion) return;
      const element = root.current;
      const camera = element.querySelector('.scene-camera');
      const world = element.querySelector('.scene-world');
      const foreground = element.querySelector('.foreground-layer');
      const idle = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 6, ease: 'sine.inOut' } });
      idle.fromTo(world, { rotationY: -1.4, rotationZ: -0.25 }, { rotationY: 1.4, rotationZ: 0.25 }, 0);
      const sway = element.querySelector('.vehicle-sway');
      if (sway) idle.fromTo(sway, { rotationY: -5, rotationZ: -0.7 }, { rotationY: 5, rotationZ: 0.7 }, 0);
      const rotateX = gsap.quickTo(camera, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      const rotateY = gsap.quickTo(camera, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      const foregroundX = gsap.quickTo(foreground, 'x', { duration: 1.1, ease: 'power3.out' });
      const move = (event) => {
        if (event.pointerType !== 'mouse') return;
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        rotateX(-y * 3); rotateY(x * 5); foregroundX(-x * 18);
      };
      const leave = () => { rotateX(0); rotateY(0); foregroundX(0); };
      let inView = true;
      const syncPlayback = () => idle.paused(document.hidden || !inView);
      const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncPlayback(); });
      observer.observe(element);
      syncPlayback();
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerleave', leave);
      document.addEventListener('visibilitychange', syncPlayback);
      return () => {
        observer.disconnect(); element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', syncPlayback);
      };
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [motion, vehicle?.id, scene.id, isAssigned], revertOnUpdate: true });

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (!motion || !isOver) return;
      gsap.fromTo('.reception-outline', { opacity: 0.2 }, { opacity: 0.85, duration: 0.55, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [isOver, motion], revertOnUpdate: true });

  useGSAP(() => {
    if (!picker || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !motion) return;
    gsap.from('.scene-option', { y: 10, opacity: 0, stagger: 0.045, duration: 0.3, ease: 'power2.out' });
  }, { scope: root, dependencies: [picker], revertOnUpdate: true });

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !motion) return;
    gsap.from('.background-layer', { opacity: 0, duration: 0.6, ease: 'power2.out' });
  }, { scope: root, dependencies: [scene.id], revertOnUpdate: true });

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !motion) return;
    gsap.from('.scene-heading', { y: 8, opacity: 0, duration: 0.4, ease: 'power2.out' });
  }, { scope: root, dependencies: [vehicle?.id], revertOnUpdate: true });

  useEffect(() => {
    if (!picker) return;
    const escape = (event) => { if (event.key === 'Escape') { setPicker(false); pickerButton.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [picker]);

  function chooseScene(id) { onSceneChange(id); setPicker(false); pickerButton.current?.focus(); }
  return <>
    <section className={`scene-shell ${dragging ? 'drag-active' : ''}`} ref={root} aria-label="Escenario del vehículo">
      <div ref={setNodeRef} className={`scene-viewport ${isOver ? 'is-over' : ''}`} data-testid="showroom" data-scene={scene.id} aria-label={`Área de asignación de ${project.name}`}>
        <div className="scene-camera"><div className="scene-world"><div className="background-layer" style={{ backgroundImage: `url("${scene.image}")` }} /><div className="atmosphere-layer" />{vehicle && <PaperVehicle key={`${project.id}-${vehicle.id}-${isAssigned}`} vehicle={vehicle} arrival={pending.includes(vehicle.id)} motion={motion} />}<div aria-hidden="true" className={`foreground-layer ${scene.id === 'bg-5' ? 'forest' : ''}`}>
          {scene.id === 'bg-5' && <><img className="paper-tree tree-left" src={pineImage} alt="" /><img className="paper-tree tree-right" src={pineImage} alt="" /></>}
          <div className="paper-verge verge-left" /><div className="paper-verge verge-right" />
        </div></div></div>
        <div className="scene-top-controls"><button ref={pickerButton} className="scene-control" onClick={() => setPicker(!picker)} aria-expanded={picker} aria-controls="scene-picker"><Image size={16} /> Cambiar fondo<ChevronDown size={13} /></button><button className="scene-control motion-control" onClick={() => setMotion(!motion)} aria-pressed={!motion} aria-label={motion ? 'Pausar movimiento' : 'Activar movimiento'} title={motion ? 'Pausar movimiento' : 'Activar movimiento'}>{motion ? <Pause size={15} /> : <Play size={15} />}</button></div>
        {picker && <div id="scene-picker" className="scene-picker" aria-label="Elegir escenario"><div><span>Elige el próximo camino</span><button className="icon-button" aria-label="Cerrar fondos" onClick={() => { setPicker(false); pickerButton.current?.focus(); }}><X size={16} /></button></div><div className="scene-options">{SCENES.map((item) => <button key={item.id} className={`scene-option ${scene.id === item.id ? 'chosen' : ''}`} onClick={() => chooseScene(item.id)} aria-pressed={scene.id === item.id}><img src={item.image} alt="" loading="lazy" /><span>{item.name}{scene.id === item.id && <Check size={12} />}</span></button>)}</div></div>}
        <div className="scene-heading" key={`heading-${vehicle?.id}`}><span className="scene-mode"><span />{vehicle ? (isAssigned ? 'En este proyecto' : 'Vista previa · sin asignar') : 'Tu próximo destino'}</span><h2>{vehicle ? vehicle.model : 'Un nuevo camino'}{vehicle && <span>{vehicle.year}</span>}</h2><p>{vehicle ? operationNames[vehicle.operation] : 'Arrastra una tarjeta para previsualizar su vehículo.'}</p></div>
        {!vehicle && <div className="scene-empty"><CarFront size={72} strokeWidth={1} /><p>El escenario está listo.<br />Trae un vehículo a este proyecto.</p></div>}
        <div className="reception-outline" aria-hidden="true" />
        {isOver && <div className="drop-prompt"><ArrowDownLeft size={20} />Suelta para revisar la asignación a {project.name}</div>}
        {vehicle && isAssigned && <div className="scene-bottom"><span className="assigned-seal"><Check size={16} />Unidad asignada</span></div>}
      </div>
      <div className="scene-border-caption"><span><Layers3 size={13} /> Escenario de proyecto</span><span>Arrastra una unidad para darle un lugar<ArrowDownLeft size={13} /></span></div>
    </section>
    <section className="vehicle-hud" aria-label="Datos del vehículo seleccionado"><div><ShieldCheck size={19} /><span>Estado<strong>{vehicle ? conditionNames[vehicle.condition] : 'Sin selección'}</strong></span></div><div><ScanLine size={19} /><span>Placa<strong>{vehicle?.plate ?? '—'}</strong></span></div><div><Palette size={19} /><span>Color<strong>{vehicle?.color.toLocaleLowerCase('es') ?? '—'}</strong></span></div><button onClick={() => onInfo('vehicle')} disabled={!vehicle}><Info size={19} /><span>Más información<strong>Ficha completa</strong></span><ChevronRight size={16} /></button></section>
    <section className="assigned-roster" aria-label="Vehículos del proyecto"><div className="roster-heading"><h2>En este proyecto <span>{assigned.length}</span></h2><div>{assigned.length > 1 && <><button className="icon-button" aria-label="Vehículo anterior" onClick={() => onSelect(assigned[(index - 1 + assigned.length) % assigned.length])}><ChevronLeft size={17} /></button><button className="icon-button" aria-label="Vehículo siguiente" onClick={() => onSelect(assigned[(index + 1) % assigned.length])}><ChevronRight size={17} /></button></>}</div></div>
      {assigned.length ? <div className="roster-list">{assigned.map((item) => <article data-assigned={item.id} key={item.id} className={`roster-card ${item.id === vehicle?.id ? 'selected' : ''}`}><button className="roster-select" onClick={() => onSelect(item)} aria-label={`Ver ${item.plate}`} aria-pressed={item.id === vehicle?.id}><img src={carImage(item)} alt="" /><span><strong>{item.plate}</strong><small>{item.model}</small></span></button><button className="icon-button remove-assignment" onClick={() => onRelease(item)} aria-label={`Retirar ${item.plate} del proyecto`} title="Retirar del proyecto"><X size={18} /></button></article>)}</div> : <div className="roster-empty"><Plus size={18} /><p>Aún no hay unidades asignadas.<span>Arrastra una tarjeta al escenario y confirma la asignación.</span></p></div>}
    </section>
  </>;
}

