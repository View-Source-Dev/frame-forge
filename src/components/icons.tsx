"use client";

// Client boundary for lucide-react icons.
//
// This build of lucide-react (v1.26) ships `context.mjs` with `"use strict"`
// placed BEFORE `"use client"`, so its own client directive is ignored and the
// module leaks into the RSC server graph — where `React.createContext` does not
// exist, crashing page-data collection. Re-exporting the icons through this
// properly-directived module keeps lucide strictly inside the client graph, so
// server components can render these icons as client references without ever
// evaluating lucide on the server.
export { ArrowLeft, ArrowRight, Boxes, Plus } from "lucide-react";
