const http = require('http');
const express = require('express');
const SocketIO = require('socket.io');
const socketStream = require('socket.io-stream');
const OpenCV = require('opencv');

const PORT = 3000;

let app = express();

app.use(express.static(`${__dirname}/public`));
app.use('/socket.io.js', express.static(`${__dirname}/node_modules/socket.io-client/socket.io.js`));
app.use('/socket.io-stream.js', express.static(`${__dirname}/node_modules/socket.io-stream/socket.io-stream.js`));
app.use('/system.js', express.static(`${__dirname}/node_modules/systemjs/dist/system.js`));
app.use('/traceur.js', express.static(`${__dirname}/node_modules/traceur/bin/traceur.js`));

class SocketIoServer extends SocketIO {
  constructor(server, port = 3000) {
    super(server);

    this.on('connection', (socket) => {
      SocketIoServer.log(`User ${socket.id} connected`);

      this.processImage(socket, SocketIoServer.CASCADES_PATHS.FACE_RECOGNITION, SocketIoServer.API.FACE_RECOGNITION);
      this.processImage(socket, SocketIoServer.CASCADES_PATHS.PALM_RECOGNITION, SocketIoServer.API.PALM_RECOGNITION);

      socket.on('disconnect', () => {
        SocketIoServer.log(`User ${socket.id} disconnected`);

        socket.removeAllListeners();
      });
    });

    server.listen(port, () => SocketIoServer.log(`App listening on port ${port}`));
  }

  static get API() {
    return {
      FACE_RECOGNITION: 'face-recognition',
      PALM_RECOGNITION: 'palm-recognition',
      RECOGNITION_ERROR: 'recognition-error'
    }
  }

  static get CASCADES_PATHS() {
    return {
      FACE_RECOGNITION: OpenCV.FACE_CASCADE,
      PALM_RECOGNITION: 'cascades/palm.xml'
    }
  }

  static log(message) {
    console.log(message);
  }

  processImage(socket, pathToCascade, apiName) {
    socketStream(socket).on(apiName, (stream) => {
      let imageDataStream = new OpenCV.ImageDataStream();

      imageDataStream.once('load', (image) =>
        image.detectObject(pathToCascade, {}, (err, objects) => {
          if (err) {
            SocketIoServer.log(err);

            socket.emit(SocketIoServer.API.RECOGNITION_ERROR, err);
          } else {
            socket.emit(apiName, objects);
          }
        }));

      stream.pipe(imageDataStream);
    });
  }
}

new SocketIoServer(http.createServer(app), PORT);
