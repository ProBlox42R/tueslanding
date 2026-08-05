export function toPublicUser(u) {
    return {
        id: u.id,
        username: u.username,
        email: u.email,
        emailVerified: u.email_verified === 1,
        role: u.role,
    };
}
//# sourceMappingURL=auth.types.js.map