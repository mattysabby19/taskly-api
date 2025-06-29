"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const userController_2 = require("../controllers/userController");
const router = express_1.default.Router();
router.get('/', auth_1.requireAuth, userController_1.getTeamMembers);
router.post('/', auth_1.requireAuth, userController_1.createUser);
router.put('/role', auth_1.requireAuth, userController_1.updateUserRole);
router.put('/deactivate', auth_1.requireAuth, userController_1.deactivateUser);
router.put('/role', auth_1.requireAuth, userController_2.updateUserRoleExplicit);
exports.default = router;
