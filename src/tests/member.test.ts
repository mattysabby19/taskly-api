// src/tests/member.test.ts
import * as memberService from '../services/memberService';

describe('Member Service', () => {
  const mockUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    group_id: '11111111-1111-1111-1111-111111111111'
  };

  it('should sign up a user and return a token', async () => {
    const token = await memberService.signup(mockUser);
    expect(typeof token).toBe('string');
  });

  it('should log in a user and return a token', async () => {
    await memberService.signup(mockUser);
    const token = await memberService.login({ email: mockUser.email, password: mockUser.password });
    expect(typeof token).toBe('string');
  });

  it('should get a member by ID', async () => {
    const { id } = await memberService.signup(mockUser).then(() => memberService.getMembersByGroupId(mockUser.group_id).then(m => m[0]));
    const member = await memberService.getMemberById(id);
    expect(member.email).toBe(mockUser.email);
  });

  it('should update a member name', async () => {
    const member = await memberService.signup(mockUser).then(() => memberService.getMembersByGroupId(mockUser.group_id).then(m => m[0]));
    const updated = await memberService.updateMember(member.id, { name: 'Updated Name' }, member);
    expect(updated.name).toBe('Updated Name');
  });

  it('should delete a member if admin', async () => {
    const member = await memberService.signup(mockUser).then(() => memberService.getMembersByGroupId(mockUser.group_id).then(m => m[0]));
    await expect(memberService.deleteMember(member.id, member)).resolves.toBeUndefined();
  });
});
