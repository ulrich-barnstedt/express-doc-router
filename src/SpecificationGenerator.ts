import mongoose from "mongoose";
import {AutoRouter} from "./AutoRouter";
import {OpenAPIV3, OpenAPIV3_1} from "openapi-types";
import {MetaRouterType} from "./MetaMiddleware";
import HttpMethods = OpenAPIV3.HttpMethods;
import m2s from "mongoose-to-swagger";

export class SpecificationGenerator {
    private readonly autoRouter: AutoRouter;
    private readonly schemas: Record<string, mongoose.Model<any>>;
    private readonly merge: Partial<OpenAPIV3_1.Document>;
    private readonly generateTags: boolean;
    private readonly reformatTemplates: boolean;
    private readonly defaultResponse: boolean;

    public readonly defaultSpec: OpenAPIV3_1.Document = {
        openapi: "3.0.0",
        info: {
            title: "Unnamed API",
            version: "1.0.0"
        },
        servers: [],
        paths: {},
        webhooks: {},
        components: {},
        security: [],
        tags: [],
    };

    constructor (
        autoRouter: AutoRouter,
        schemas: Record<string, mongoose.Model<any>>,
        merge: Partial<OpenAPIV3_1.Document>,
        options : {
            generateTags : boolean,
            reformatTemplates : boolean,
            defaultResponse : boolean
        } = {
            generateTags: true,
            reformatTemplates: true,
            defaultResponse: true
        }
    ) {
        this.autoRouter = autoRouter;
        this.schemas = schemas;
        this.merge = merge;

        this.generateTags = options.generateTags;
        this.reformatTemplates = options.reformatTemplates;
        this.defaultResponse = options.defaultResponse;
    }

    public generateBase (): OpenAPIV3_1.Document {
        return JSON.parse(JSON.stringify(this.defaultSpec));
    }

    public generate () : OpenAPIV3_1.Document {
        let specification = this.generateBase();
        specification.paths = specification.paths!;
        let [router, paths] = this.autoRouter.exportInfo();

        for (let [path, router] of paths) {
            let set_paths = [];

            for (let layer of router.stack) {
                if (!("route" in layer)) continue;
                let fullPath = "/" + path + layer.route.path;

                if (this.reformatTemplates) {
                    fullPath = fullPath.replaceAll(/:([A-Za-z0-9_])+/g, rep => `{${rep.slice(1)}}`);
                }

                let assembled = specification.paths[fullPath];
                if (assembled === undefined) {
                    assembled = {};
                    specification.paths[fullPath] = assembled;
                    set_paths.push(fullPath);
                }

                for (let raw_method in layer.route.methods) {
                    let method = raw_method as HttpMethods;

                    assembled[method] = {
                        description : "No description specified.",
                        responses:
                            this.defaultResponse ? {default: {description: "No responses were specified."}} : {}
                    };

                    if (this.generateTags) {
                        assembled[method]!.tags = [path];
                    }
                }

                for (let layer2 of layer.route.stack) {
                    if (!("meta_stored" in layer2.handle)) continue;

                    for (let raw_method in layer.route.methods) {
                        let method = raw_method as HttpMethods;
                        assembled[method] = {...assembled[method], ...layer2.handle.meta_stored};
                    }
                }
            }

            if ("meta_stored" in router) {
                let meta_router = router as MetaRouterType;

                for (let sp of set_paths) {
                    specification.paths[sp] = {...specification.paths[sp], ...meta_router.meta_stored};
                }
            }
        }

        specification.components!.schemas = {}
        for (let name in this.schemas) {
            specification.components!.schemas[name] = m2s(this.schemas[name]);
            // specification.components!.schemas[name].type = "object";
        }

        specification = {...specification, ...this.merge};
        return specification;
    }
}