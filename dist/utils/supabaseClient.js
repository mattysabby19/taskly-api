"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseUserClientFromRequest = exports.getSupabaseForUser = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const getSupabaseForUser = (token) => (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    },
});
exports.getSupabaseForUser = getSupabaseForUser;
const getSupabaseUserClientFromRequest = (req) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token)
        throw new Error('Missing bearer token');
    return (0, exports.getSupabaseForUser)(token);
};
exports.getSupabaseUserClientFromRequest = getSupabaseUserClientFromRequest;
