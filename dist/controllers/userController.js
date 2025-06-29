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
exports.updateUserRoleExplicit = exports.deactivateUser = exports.updateUserRole = exports.createUser = exports.getTeamMembers = void 0;
const supabaseClient_1 = require("../utils/supabaseClient");
const getTeamMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const userId = req.user.id;
    // Step 1: Get client_id of the logged in user
    const { data: user, error: userError } = yield supabase
        .from('users')
        .select('clientid')
        .eq('id', userId)
        .single();
    if (userError || !user) {
        res.status(403).json({ error: 'Unauthorized or missing user' });
        return;
    }
    // Step 2: Return all users (members) for this client
    const { data, error } = yield supabase
        .from('users')
        .select('id, name, email, role, is_active, created_at')
        .eq('clientid', user.clientid);
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(200).json(data);
});
exports.getTeamMembers = getTeamMembers;
// 1. Invite a new team member (Admin only)
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const adminId = req.user.id;
    const { email, name, role } = req.body;
    // Step 1: Get admin's client_id and role
    const { data: adminData, error: adminError } = yield supabase
        .from('users')
        .select('clientid, role')
        .eq('id', adminId)
        .single();
    if (adminError || !adminData || adminData.role !== 'Admin') {
        res.status(403).json({ error: 'Only admins can invite members' });
        return;
    }
    // Step 2: Create new user record (user must verify their email separately)
    const { data, error } = yield supabase
        .from('users')
        .insert([
        {
            clientid: adminData.clientid,
            email,
            name,
            role: role !== null && role !== void 0 ? role : 'Member',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ])
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
});
exports.createUser = createUser;
// 2. Update user role (Admin only)
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const adminId = req.user.id;
    const { userId, newRole } = req.body;
    // Validate input
    if (!['Admin', 'Member'].includes(newRole)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
    }
    // Check admin privileges
    const { data: adminData, error: adminError } = yield supabase
        .from('users')
        .select('clientid, role')
        .eq('userId', adminId)
        .single();
    if (adminError || (adminData === null || adminData === void 0 ? void 0 : adminData.role) !== 'Admin') {
        res.status(403).json({ error: 'Only admins can update roles' });
        return;
    }
    // Update role for a user within same client
    const { error: updateError } = yield supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('userId', userId)
        .eq('clientid', adminData.clientid);
    if (updateError) {
        res.status(500).json({ error: updateError.message });
        return;
    }
    res.status(200).json({ message: 'Role updated successfully' });
});
exports.updateUserRole = updateUserRole;
// 3. Deactivate user (Admin only)
const deactivateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const adminId = req.user.id;
    const { userId } = req.body;
    const { data: adminData, error: adminError } = yield supabase
        .from('users')
        .select('clientid, role')
        .eq('id', adminId)
        .single();
    if (adminError || (adminData === null || adminData === void 0 ? void 0 : adminData.role) !== 'Admin') {
        res.status(403).json({ error: 'Only admins can deactivate users' });
        return;
    }
    const { error: updateError } = yield supabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('clientid', adminData.clientid);
    if (updateError) {
        res.status(500).json({ error: updateError.message });
        return;
    }
    res.status(200).json({ message: 'User deactivated successfully' });
});
exports.deactivateUser = deactivateUser;
const updateUserRoleExplicit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabaseClient_1.getSupabaseUserClientFromRequest)(req);
    const requestingUserId = req.user.id;
    const { userId, newRole } = req.body;
    if (!['Admin', 'Member'].includes(newRole)) {
        res.status(400).json({ error: 'Invalid role provided' });
        return;
    }
    // Check if requesting user is admin
    const { data: requester, error: requesterError } = yield supabase
        .from('users')
        .select('clientid, role')
        .eq('id', requestingUserId)
        .single();
    if (requesterError || (requester === null || requester === void 0 ? void 0 : requester.role) !== 'Admin') {
        res.status(403).json({ error: 'Only admins can change roles' });
        return;
    }
    // Update role only within same client
    const { error: updateError } = yield supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('clientid', requester.clientid);
    if (updateError) {
        res.status(500).json({ error: updateError.message });
        return;
    }
    res.status(200).json({ message: `User role updated to ${newRole}` });
});
exports.updateUserRoleExplicit = updateUserRoleExplicit;
