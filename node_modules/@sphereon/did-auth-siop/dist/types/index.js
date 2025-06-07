"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIOPErrors = exports.LOG = void 0;
const oid4vc_common_1 = require("@sphereon/oid4vc-common");
const ssi_types_1 = require("@sphereon/ssi-types");
const Errors_1 = __importDefault(require("./Errors"));
exports.SIOPErrors = Errors_1.default;
exports.LOG = oid4vc_common_1.VCI_LOGGERS.options('sphereon:siop-oid4vp', { methods: [ssi_types_1.LogMethod.EVENT, ssi_types_1.LogMethod.DEBUG_PKG] }).get('sphereon:siop-oid4vp');
__exportStar(require("./JWT.types"), exports);
__exportStar(require("./SIOP.types"), exports);
__exportStar(require("./Events"), exports);
__exportStar(require("./SessionManager"), exports);
__exportStar(require("./VpJwtIssuer"), exports);
__exportStar(require("./VpJwtVerifier"), exports);
//# sourceMappingURL=index.js.map