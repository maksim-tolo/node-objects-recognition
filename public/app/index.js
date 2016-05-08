import socketIO from 'socketIO';
import socketStream from 'socketStream';

class ObjectsRecogniser {
    constructor(config = {}) {
        let options = Object.assign(ObjectsRecogniser.getDefaultOptions(), config);

        this.socket = socketIO.connect(options.socketUrl);
        this.width = options.width;
        this.height = options.height;
        this.videoElement = document.querySelector(options.videoSelector);
        this.canvasElement = document.querySelector(options.canvasSelector);
        this.synchronise = options.synchronise;
        this.repaintDelay = options.repaintDelay;
        this.faces = [];

        if (this.socket && this.videoElement && this.canvasElement) {
            this.videoElement.style.display = 'none';
            this.canvasElement.width = options.width;
            this.canvasElement.height = options.height;

            this.socket.on('connect', () => this.onConnect());
            this.socket.on(ObjectsRecogniser.API.FACE_RECOGNITION, (faces) => {
                this.faces = faces;
                this.getFaces();
            });
        }
    }

    static getDefaultOptions() {
        return {
            socketUrl: location.origin,
            videoSelector: '#video',
            canvasSelector: '#canvas',
            width: 640,
            height: 480,
            synchronise: true,
            repaintDelay: 0
        }
    }

    static get API() {
        return {
            FACE_RECOGNITION: 'face-recognition'
        }
    }

    static getUserMedia() {
        let userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;

        return userMedia ? userMedia.bind(navigator) : null;
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
            userMedia(CONSTRAINTS, (stream) => this.onUserMedia(stream), (error) => ObjectsRecogniser.showError(error));
        } else {
            ObjectsRecogniser.showError('Browser does not support WebCam integration');
        }
    }

    onUserMedia(stream) {
        this.videoElement.src = ObjectsRecogniser.getStreamUrl(stream);
        this.videoElement.play();
        this.getFaces();

        if (!this.synchronise) {
            this.repaint();
        }
    }

    drawImage() {
        this.canvasElement.getContext('2d').drawImage(this.videoElement, 0, 0, this.width, this.height);
    }

    leadRoundFaces() {
        let context = this.canvasElement.getContext('2d');

        this.faces.forEach(({x, y, width, height} = {}) => context.strokeRect(x, y, width, height));
    }

    getFaces() {
        let stream = socketStream.createStream();

        this.drawImage();
        socketStream(this.socket).emit(ObjectsRecogniser.API.FACE_RECOGNITION, stream);
        this.canvasElement.toBlob((blob) => socketStream.createBlobReadStream(blob).pipe(stream));
        this.leadRoundFaces();
    }

    repaint() {
        this.drawImage();
        this.leadRoundFaces();

        setTimeout(() => this.repaint(), this.repaintDelay);
    }

}

new ObjectsRecogniser();
