import { useEffect, useRef } from 'react';
import { AlertTriangle, CarFront, X } from 'lucide-react';
import { carImage } from '../assets.js';

export default function AssignmentDialog({ action, onCancel, onConfirm }) {
  const root = useRef(null);
  const blocked = action.type === 'blocked';
  const removing = action.type === 'release';
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = root.current;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const title = blocked ? 'No se puede asignar este vehículo' : removing ? '¿Retirar vehículo del proyecto?' : '¿Asignar vehículo al proyecto?';
  return <dialog ref={root} className={`assignment-dialog ${blocked ? 'warning-dialog' : ''}`} aria-labelledby="assignment-title" aria-describedby="assignment-description" onCancel={onCancel}>
    <div className="assignment-dialog-heading"><span className="action-symbol">{blocked ? <AlertTriangle size={23} /> : removing ? <X size={23} /> : <CarFront size={23} />}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={onCancel}><X size={19} /></button></div>
    <h2 id="assignment-title">{title}</h2>
    <div className="assignment-unit"><img src={carImage(action.vehicle)} alt="" /><div><strong>{action.vehicle.model}</strong><span>{action.vehicle.plate} · {action.vehicle.year}</span></div></div>
    <p id="assignment-description">{blocked ? 'Puedes previsualizar la unidad y consultar su ficha, pero no asignarla a un proyecto.' : removing ? <>Se quitará la asignación de <strong>{action.project.name}</strong>. El vehículo volverá al inventario.</> : <>Se asignará esta unidad a <strong>{action.project.name}</strong>.</>}</p>
    {blocked && <ul className="assignment-reasons">{action.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
    <div className="assignment-dialog-actions">{blocked ? <button className="primary-button" onClick={onCancel}>Entendido</button> : <><button className="secondary-button" onClick={onCancel}>Cancelar</button><button className={removing ? 'danger-button' : 'primary-button'} onClick={onConfirm}>{removing ? 'Sí, retirar vehículo' : 'Sí, asignar vehículo'}</button></>}</div>
  </dialog>;
}
