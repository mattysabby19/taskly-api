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
exports.createClientWithAdmin = exports.getClientProfile = void 0;
const supabaseClient_1 = require("../utils/supabaseClient");
const getClientProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const userId = req.user.id;
    // Step 1: Find user's client ID
    const { data: user, error: userError } = yield supabase
        .from('users')
        .select('clientid')
        .eq('id', userId)
        .single();
    if (userError || !user) {
        res.status(403).json({ error: 'User not found' });
        return;
    }
    // Step 2: Get client profile
    const { data: client, error: clientError } = yield supabase
        .from('clients')
        .select('*')
        .eq('id', user.clientid)
        .single();
    if (clientError) {
        res.status(500).json({ error: clientError.message });
        return;
    }
    res.status(200).json(client);
});
exports.getClientProfile = getClientProfile;
const createClientWithAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const { name, email, phone, address, password, adminName } = req.body;
    // 1. Insert Client
    const { data: clientData, error: clientError } = yield supabase
        .from('clients')
        .insert([{ name, email, phone, address }])
        .select('*')
        .single();
    console.log('Insert response:', { clientData, clientError });
    if (clientError || !(clientData === null || clientData === void 0 ? void 0 : clientData.clientid)) {
        console.error('Client creation failed:', clientError, clientData); // Log both
        res.status(500).json({ error: (clientError === null || clientError === void 0 ? void 0 : clientError.message) || 'Failed to create client' });
        return;
    }
    const clientId = clientData.clientid;
    console.log('Created client ID:', clientId);
    // 2. Insert Admin User (with client_id)
    const { data: userData, error: userError } = yield supabase
        .from('users')
        .insert([
        {
            clientid: clientId,
            email,
            name: adminName !== null && adminName !== void 0 ? adminName : 'Admin',
            role: 'Admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ])
        .select('*')
        .single();
    if (userError) {
        res.status(500).json({ error: userError.message });
        return;
    }
    res.status(201).json({ client: clientData, admin: userData });
});
exports.createClientWithAdmin = createClientWithAdmin;
