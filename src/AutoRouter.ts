import express from "express";
import {glob} from "glob";

export class AutoRouter {
    private readonly ext: string;
    private readonly cwd: string;
    private readonly out: string;
    private readonly router: express.Router;
    private readonly paths: [string, express.Router][];
    private loaded: boolean;

    constructor(cwd: string, ext: string, out: string) {
        this.ext = ext;
        this.cwd = cwd;
        this.out = out;
        this.router = express.Router();

        this.paths = [];
        this.loaded = false;
    }

    private async resolve () {
        if (this.loaded) return;

        let files = await glob(`**/*${this.ext}`, {cwd: this.cwd, withFileTypes: true});
        let pathNames = files.map(f => [
            f.relativePosix().replace(this.ext, ""),
            this.out + f.sep + f.relative().replace(".ts", ".js")
        ]);

        for (let i = 0; i < pathNames.length; i++) {
            console.log(`Loading Router [${pathNames[i][0]}] from ${pathNames[i][1]}`);

            this.paths.push([
                pathNames[i][0],
                <express.Router>(await import(pathNames[i][1])).default.default
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