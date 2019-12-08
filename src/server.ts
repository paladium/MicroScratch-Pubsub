import { AppService } from "./models";
import express from 'express'
import cors from 'cors'
import bodyParser from "body-parser";
import AppConfig from "./config";
import ws from 'express-ws'
import * as WebSocket from 'ws'

export default class AppServer implements AppService
{
    private app!: express.Express;

    constructor(private appConfig: AppConfig)
    {
        this.app = express();
        this.app.use(cors());
        this.app.use(bodyParser.json());
        ws(this.app);
        this.configureRoutes();
    }

    private configureRoutes()
    {
        this.app.get("/", (req, res) => {
            res.json({ok: true});
        });
        (this.app as any).ws('/bot', (ws: WebSocket, req: express.Request) => {
            ws.on('message', (message: string) => {
                console.log("received ", message);
                ws.send(message);
            });
        });
    }

    start(): void {
        this.app.listen(this.appConfig.server.port, () => {
            console.log(`Started app server service at ${this.appConfig.server.port}`);
        });
    }
}