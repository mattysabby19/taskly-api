"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const taskController_1 = require("../controllers/taskController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ✅ Typecast controller to satisfy Express
router.get('/', auth_1.requireAuth, taskController_1.getTasks);
router.post('/', auth_1.requireAuth, taskController_1.addTask);
exports.default = router;
