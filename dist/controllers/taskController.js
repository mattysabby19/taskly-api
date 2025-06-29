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
exports.addTask = exports.getTasks = void 0;
const supabaseClient_1 = require("../utils/supabaseClient");
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const userId = req.user.id;
    console.log('User ID:', userId);
    // Step 1: Fetch the user's client_id
    const { data: userData, error: userError } = yield supabase
        .from('users')
        .select('clientid')
        .eq('userid', userId)
        .single();
    if (userError || !userData) {
        res.status(403).json({ error: 'Unable to fetch client ID for user' });
        return;
    }
    // Step 2: Fetch tasks for that client
    const { data, error } = yield supabase
        .from('tasks')
        .select('*')
        .eq('clientid', userData.clientid)
        .order('duedate', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(200).json(data);
});
exports.getTasks = getTasks;
const addTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { title, description, duedate, priority, status, assignedtouserid, isrecurring, recurrencerule, parenttaskid } = req.body;
    const userId = req.user.id;
    console.log('User ID:', userId);
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    const supabaseUserClient = (0, supabaseClient_1.getSupabaseForUser)(token);
    // Step 1: Get user's client ID
    const { data: userData, error: userError } = yield supabaseUserClient
        .from('users')
        .select('clientid')
        .eq('userid', userId)
        .single();
    if (userError || !userData) {
        res.status(403).json({ error: 'User not found or no client associated' });
        return;
    }
    // Step 2: Insert new task
    const { data, error } = yield supabaseUserClient
        .from('tasks')
        .insert([
        {
            clientid: userData.clientid,
            createdbyuserid: userId,
            assignedtouserid,
            title,
            description,
            duedate,
            priority,
            status,
            isrecurring,
            recurrencerule,
            parenttaskid,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString(),
        }
    ])
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
});
exports.addTask = addTask;
