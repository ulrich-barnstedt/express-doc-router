# express-doc-router

TypeScript module for automatically loading and documenting [express](https://www.npmjs.com/package/express) endpoints.

## Installation

The package can be installed via NPM:

```shell
$ npm install express-doc-router
```

## Pretext

The documentation-generation is based on the _OpenAPI V3 Specification_:  
 - [OpenAPI V3.1 Specification](https://spec.openapis.org/oas/latest.html) 
 - [OpenAPI V3.1 on Swagger](https://swagger.io/specification/)

## Usage

### Setting up endpoints

Endpoints should export a router object:
```ts
import express from "express";
const router = express.Router();

// ... endpoint logic

export default Router;
```

### Loading routes

Endpoints and routes created in the above format can then be automatically loaded from a specified directory:
```ts
import express from "express";

// import the router
import {AutoRouter} from "express-doc-router";

// standard express app
const app = express();

// intialize the router
// here assuming the routes are in src/routes
const autoRouter = new AutoRouter(__dirname, "../src/routes", ".ts", "./routes");

// in an async block 
(async () => {
    
    // tell express to forward all routes on /api to the AutoRouter
    app.use("/api", await autoRouter.generate());
    
    app.listen(8000, () => {});
})();
```

### Generating documentation

The information from the loaded routes can be used to automatically generate documentation:
```ts
// ... continiung from the previous example

// import the OpenAPI specification generator
import {SpecificationGenerator} from "express-doc-router";

// setup the generator
const specGenerator = new SpecificationGenerator(
    // pass our router
    autoRouter,
    
    // pass any mongoDB schemas to be used in the documentation
    // format {name: mongoose.Model}
    {User: myUserModel},
    
    // set initial configuration for the documentation such as title, version, ...
    // see OpenAPI specification for more properties
    {
        info: {
            title: "My API",
            version: "1.2.3",
            description: "This is the documentation for my API"
        },
        servers : [
            {
                url : "http://localhost:8000/api/",
                description: "Local test server"
            },
            {
                url: "http://deployment.com/api/",
                description: "Deployed server"
            }
        ]
    }
);

// generate the specification
const specification = specGenerator.generate();
```

The generated specification can either be exported or directly used by tools such as [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express):
```ts
// example with swagger-ui-express

import swaggerUi from "swagger-ui-express";

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specification));
```

### Adding details to endpoints

The automatically generated documentation is relatively un-detailed, whilst the OpenAPI Specification supports a wide variety of other properties.
More information about an endpoint can be added using the `meta` middleware:
```ts
// import the meta-middlerware
import {meta} from "express-doc-router";

// example endpoint, as in "Setting up endpoints" above
router.get("/:some_param", 
    (req, res) => {
        // ... does something
        res.send(418).end();
    }, meta({
        // add metadata in the format of an OpenAPI Operation Object
        // example:
        description: "this is a custom description",
        summary: "get endpoint test",
        parameters: [
            {
                name: "some_param",
                description: "some description",
                required: true,
                in: "path"
            }
        ],
        responses: {
            "200": {
                description: "yep, a test response",
                content: {
                    "text/plain": {
                        example: "test"
                    }
                }
            }
        }
    })
);
```
This metadata is automatically read by the `SpecificationGenerator` and inserted into the finished specification.

## API

OpenAPI Specification types are referenced from [`openapi-types`](https://www.npmjs.com/package/openapi-types).

### Class `AutoRouter`

Class for automatically loading Routes from a folder.
Base for relative paths is `__dirname`, so most likely the compiled version of your `index.ts` or main script.

```
AutoRouter.constructor(
    dirname: string,        -- should always be __dirname of the caller
    twd: string,            -- folder of the .ts routes, such as ../src/routes
    ext: string,            -- file extension of the routes, normally .ts
    out: string,            -- folder containing the compiled routes, such as ./routes
    logCreation: boolean    -- if loaded routes should be output to the console for debug purposes
)

AutoRouter.generate() : Promise<express.Router>   -- generate the routes and return a router
```

### Middleware `meta`

Express middleware for adding additional metadata to and endpoint, should be used with `<router>.<method>(<path>, <other handlers>, meta({ ... }))`.

```
meta(
    metadata: OpenAPIV3_1.OperationObject   -- the metadata to be injected into the specification
) : express.Handler
```

### Class `MetaRouter`

`MetaRouter` is an extension of `express.Router` to allow adding metadata at router level (`Path Item` in specification).
It adds a `.meta()` function, which can be called same as `.get()`, `.post()`, `.delete()`, ...

```
MetaRouter.meta(
    metadata: OpenAPIV3_1.PathItemObject    -- metadata to be injected into the specification
)
```

### Class `SpecificationGenerator`

Class for generating an OpenAPI V3 Specification using an `AutoRouter`.
Schemas are inserted under `specification.components.schemas`, as the specification requests.

```
SpecificationGenerator.constructor(
    autoRouter: autoRouter,                     -- autoRouter to use for generation
    schemas: Record<string, mongoose.Model>,    -- mongoose schemas to be converted and added into the specification
    merge: Partial<OpenAPIV3_1.Document>,       -- initial information to merge into the generated schema such as name, version, ...
    options: {
        generateTags: boolean,                  -- if OpenAPI tags should be generated per route group
        reformatTemplates: boolean,             -- if express templates in the format :parameter should be converted to the OpenAPI {paramter}
        defaultResponse: boolean                -- if a default response should be added incase none are specified by the user
    }
)

SpecificationGenerator.generate() : OpenAPIV3_1.Document    -- generate the full specification 
```
