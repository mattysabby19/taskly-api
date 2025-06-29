"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clientController_1 = require("../controllers/clientController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/me', auth_1.requireAuth, clientController_1.getClientProfile);
router.post('/', clientController_1.createClientWithAdmin); // Public endpoint
exports.default = router;
