import ObjectsRecogniser from './classes/object-recogniser.class';

let objectsRecogniser = new ObjectsRecogniser();

document.getElementById('face-recognition').addEventListener('click', () =>
  objectsRecogniser.changeRecogniser(ObjectsRecogniser.API.FACE_RECOGNITION));

document.getElementById('hand-recognition').addEventListener('click', () =>
  objectsRecogniser.changeRecogniser(ObjectsRecogniser.API.PALM_RECOGNITION));
