import express from "express";
import {OpenAPIV3_1} from "openapi-types";
import OperationObject = OpenAPIV3_1.OperationObject;
import PathItemObject = OpenAPIV3_1.PathItemObject;

interface MetaHandlerFunction {
    meta_stored: OperationObject;
}
export type MetaFunction = express.Handler & MetaHandlerFunction;

export const meta = (meta: OperationObject) : MetaFunction => {
    let func: express.Handler = (req, res, next) => {
        next();
    }
    let meta_func = func as MetaFunction;
    meta_func.meta_stored = meta;

    return meta_func;
}

// -------------------

interface MetaRouterInterface {
    meta: (spec: PathItemObject) => void;
    meta_stored: PathItemObject;
}
export type MetaRouterType = express.Router & MetaRouterInterface;

export const MetaRouter = (...params: any[]) : MetaRouterType => {
    let router = express.Router(...params) as MetaRouterType;

    router.meta = (spec) => {
        router.meta_stored = spec;
    }

    return router;
}
