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

            socketStream(socket).on(SocketIoServer.API.FACE_RECOGNITION, (stream) => {
                let imageDataStream = new OpenCV.ImageDataStream();

                imageDataStream.once('load', (image) =>
                    image.detectObject(OpenCV.FACE_CASCADE, {}, (err, faces) => {
                        if (err) {
                            // TODO: notify clients about error
                            SocketIoServer.log(err);
                        } else {
                            socket.emit(SocketIoServer.API.FACE_RECOGNITION, faces);
                        }
                }));

                stream.pipe(imageDataStream);
            });

            socket.on('disconnect', () => {
                SocketIoServer.log(`User ${socket.id} disconnected`);
                socket.removeAllListeners();
            });
        });

        server.listen(port, () => SocketIoServer.log(`App listening on port ${port}`));
    }

    static get API() {
        return {
            FACE_RECOGNITION: 'face-recognition'
        }
    }

    static log(message) {
        console.log(message);
    }
}

new SocketIoServer(http.createServer(app), PORT);
