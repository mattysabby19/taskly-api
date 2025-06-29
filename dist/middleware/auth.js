"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.getSupabaseForUser = void 0;
const supabase_1 = require("../config/supabase");
const supabase_js_1 = require("@supabase/supabase-js");
const getSupabaseForUser = (token) => (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, // use anon key, not service key
{
    global: {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    },
});
exports.getSupabaseForUser = getSupabaseForUser;
const requireAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid token' });
        return;
    }
    const token = authHeader.split(' ')[1];
    const { data, error } = yield supabase_1.supabase.auth.getUser(token);
    console.log('Supabase user data:', data);
    console.log('Supabase user error:', error);
    if (error || !(data === null || data === void 0 ? void 0 : data.user)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    req.user = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata.role, // Assuming role is stored in user_metadata
        clientid: data.user.user_metadata.clientid, // Assuming client_id is stored in user_metadata
        // Add more fields from metadata if needed
    };
    next();
});
exports.requireAuth = requireAuth;
