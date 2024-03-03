import express from "express";
import {glob} from "glob";
import * as path from "path";

export class AutoRouter {
    private readonly dirname: string;
    private readonly ext: string;
    private readonly twd: string;
    private readonly out: string;
    private readonly logCreation: boolean;
    private readonly router: express.Router;
    private readonly paths: [string, express.Router][];
    private loaded: boolean;

    constructor(dirname: string, twd: string, ext: string, out: string, logCreation: boolean = false) {
        this.dirname = dirname;
        this.ext = ext;
        this.twd = twd;
        this.out = out;
        this.logCreation = logCreation;
        this.router = express.Router();

        this.paths = [];
        this.loaded = false;
    }

    private async resolve () {
        if (this.loaded) return;

        let files = await glob(`**/*${this.ext}`, {cwd: path.join(this.dirname, this.twd), withFileTypes: true});
        let pathNames = files.map(f => [
            f.relativePosix().replace(this.ext, ""),
            "file://" + path.join(this.dirname, this.out, f.relative().replace(".ts", ".js"))
        ]);

        for (let i = 0; i < pathNames.length; i++) {
            if (this.logCreation) {
                console.log(`Loading Router [${pathNames[i][0]}] from ${pathNames[i][1]}`);
            }

            let mod = (await import(pathNames[i][1])).default;
            if ("default" in mod) mod = mod.default;
            mod = <express.Router> mod;

            this.paths.push([
                pathNames[i][0],
                mod
            ])
        }

        this.loaded = true;
    }

    public async generate () : Promise<express.Router> {
        await this.resolve();

        for (let [routerPath, mod] of this.paths) {
            this.router.use("/" + routerPath, mod);
        }

        return this.router;
    }

    public exportInfo () : [express.Router, typeof this.paths] {
        return [this.router, this.paths];
    }
}