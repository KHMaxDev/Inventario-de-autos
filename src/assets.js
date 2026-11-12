const assets = import.meta.glob('../img/cars/*.png', { eager: true, query: '?url', import: 'default' });
export const carImage = (vehicle) => assets[`../img/cars/${vehicle.asset}`];

const backgrounds = import.meta.glob('../img/backgrounds/*.jpg', { eager: true, query: '?url', import: 'default' });
export const SCENES = [
  { id: 'bg-5', name: 'Bosque', caption: 'Entre luz y árboles' },
  { id: 'bg-3', name: 'Valle', caption: 'Un camino por descubrir' },
  { id: 'bg-2', name: 'Montaña', caption: 'Rumbo a nuevos destinos' },
  { id: 'bg-4', name: 'Horizonte', caption: 'El camino está abierto' },
  { id: 'bg-1', name: 'Desierto', caption: 'Más allá de lo conocido' },
].map((scene) => ({ ...scene, image: backgrounds[`../img/backgrounds/${scene.id}.jpg`] }));
export const pineImage = new URL('../img/pine.png', import.meta.url).href;
