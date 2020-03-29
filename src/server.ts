import { AppService, Command, CommandType } from "./models";
import express from 'express'
import cors from 'cors'
import bodyParser from "body-parser";
import AppConfig from "./config";
import ws from 'express-ws'
import * as WebSocket from 'ws'
import redis from 'redis'

export default class AppServer implements AppService {
    private app!: express.Express;

    constructor(private appConfig: AppConfig) {
        this.app = express();
        this.app.use(cors());
        this.app.use(bodyParser.json());
        ws(this.app);
        this.configureRoutes();
    }

    private configureRoutes() {
        this.app.get("/", (req, res) => {
            res.json({ ok: true });
        });
        //Connect to redis from this point on 
        const subscriber = redis.createClient({
            url: this.appConfig.redis.url
        });
        const publisher = redis.createClient({
            url: this.appConfig.redis.url
        });
        (this.app as any).ws('/bot', (ws: WebSocket, req: express.Request) => {
            subscriber.on("message", (channel, messsage) => {
                console.log("Received from redis", channel, messsage);
                try{
                    ws.send(JSON.stringify({
                        channel: channel,
                        message: messsage
                    }));
                }
                catch(e)
                {
                    ws.close();
                }
            });
            subscriber.subscribe(["receive-results", "request-input"]);
            ws.on('message', (message: string) => {
                console.log("Received from websocket", message);
                const command = JSON.parse(message) as Command;
                if (command.type == CommandType.UploadProgram) {
                    publisher.publish("upload-program", message);
                }
                else if (command.type == CommandType.InputValue) {
                    publisher.publish("receive-input", message);
                }
            });
        });
    }

    start(): void {
        this.app.listen(this.appConfig.server.port, () => {
            console.log(`Started app server service at ${this.appConfig.server.port}`);
        });
    }
}