import socketIO from 'socketIO';
import socketStream from 'socketStream';

class ObjectsRecogniser {
  constructor(config = {}) {
    let options = Object.assign(ObjectsRecogniser.getDefaultOptions(), config);

    this.socket = socketIO.connect(options.socketUrl);
    this.videoElement = document.createElement('video');
    this.canvasElement = document.querySelector(options.canvasSelector);
    this.synchronise = options.synchronise;
    this.repaintDelay = options.repaintDelay;
    this.currentRecogniser = options.currentRecogniser;
    this.objects = [];

    if (this.socket && this.canvasElement && this.currentRecogniser) {

      this.socket.on('connect', this.onConnect.bind(this));
      this.socket.on(ObjectsRecogniser.API.RECOGNITION_ERROR, (err) => {
        ObjectsRecogniser.showError(err);

        this.getImages();
      });
      this.socket.on(this.currentRecogniser, this.onObjectsDetect.bind(this));
    }
  }

  static getDefaultOptions() {
    return {
      socketUrl: location.origin,
      canvasSelector: '#canvas',
      synchronise: true,
      repaintDelay: 0,
      currentRecogniser: ObjectsRecogniser.API.FACE_RECOGNITION
    }
  }

  static get API() {
    return {
      FACE_RECOGNITION: 'face-recognition',
      PALM_RECOGNITION: 'palm-recognition',
      RECOGNITION_ERROR: 'recognition-error'
    }
  }

  static getUserMedia() {
    let userMedia;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      userMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      userMedia.isPromise = true;
    } else {
      userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;

      userMedia = userMedia ? userMedia.bind(navigator) : null;
    }

    return userMedia;
  }

  static getStreamUrl(stream) {
    let url = window.URL || window.webkitURL;

    return url ? url.createObjectURL(stream) : stream;
  }

  static showError(error) {
    console.error(error);
  }

  onConnect() {
    const CONSTRAINTS = {video: true, audio: false};
    let userMedia = ObjectsRecogniser.getUserMedia();

    if (userMedia) {
      if (userMedia.isPromise) {
        userMedia(CONSTRAINTS)
          .then(this.onUserMedia.bind(this))
          .catch(this.onUserMediaError.bind(this));
      } else {
        userMedia(CONSTRAINTS, this.onUserMedia.bind(this), this.onUserMediaError.bind(this));
      }
    } else {
      ObjectsRecogniser.showError('Browser does not support WebCam integration');
    }
  }

  onUserMedia(stream) {
    this.videoElement.src = ObjectsRecogniser.getStreamUrl(stream);
    this.videoElement.addEventListener('loadedmetadata', this.onVideoLoad.bind(this));
  }

  onVideoLoad() {
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    this.videoElement.play();
    this.getImages();

    if (!this.synchronise) {
      this.repaint();
    }
  }

  onUserMediaError(error) {
    const TIMEOUT = 5000;

    ObjectsRecogniser.showError(error);

    setTimeout(this.onConnect.bind(this), TIMEOUT);
  }

  onObjectsDetect(objects) {
    this.objects = objects;
    this.getImages();
  }

  drawImage() {
    this.canvasElement.getContext('2d').drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  drawRectangles() {
    let context = this.canvasElement.getContext('2d');

    this.objects.forEach(({x, y, width, height} = {}) => context.strokeRect(x, y, width, height));
  }

  getImages() {
    let stream = socketStream.createStream();

    this.drawImage();
    socketStream(this.socket).emit(this.currentRecogniser, stream);
    this.canvasElement.toBlob((blob) => socketStream.createBlobReadStream(blob).pipe(stream));
    this.drawRectangles();
  }

  repaint() {
    this.drawImage();
    this.drawRectangles();

    setTimeout(() => this.repaint(), this.repaintDelay);
  }

  changeRecogniser(recogniser) {
    if (this.videoElement.src && recogniser !== this.currentRecogniser) {
      this.socket.off(this.currentRecogniser);

      this.currentRecogniser = recogniser;

      this.socket.on(this.currentRecogniser, this.onObjectsDetect.bind(this));
      this.getImages();
    }
  }

}

export default ObjectsRecogniser;
