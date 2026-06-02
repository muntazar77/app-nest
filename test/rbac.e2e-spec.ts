// test/rbac.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

type LoginResponse = {
  accessToken: string;
};

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  // adjust if your login expects passwordHash (unusual). Prefer password.
  const adminCreds = {
    email: 'admin@acme.test',
    password: 'password123',
    orgSlug: 'acme',
  };
  const userCreds = {
    email: 'user@acme.test',
    password: 'password123',
    orgSlug: 'acme',
  };

  // If your API REALLY expects passwordHash instead of password,
  // change to:
  // const adminCreds = { email: 'admin@example.com', passwordHash: 'password123' };
  // const userCreds = { email: 'user@example.com', passwordHash: 'password123' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  type LoginCreds = { orgSlug: string; email: string; password: string };

  async function login(creds: LoginCreds): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    return res.body.accessToken as string;
  }

  it('GET /permissions without token -> 401', async () => {
    await request(app.getHttpServer()).get('/permissions').expect(401);
  });

  it('GET /permissions with normal user token -> 403', async () => {
    const token = await login({
      orgSlug: 'acme',
      email: 'user@acme.test',
      password: 'password123',
    });

    await request(app.getHttpServer())
      .get('/permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /permissions with admin token -> 200', async () => {
    const token = await login({
      orgSlug: 'acme',
      email: 'admin@acme.test',
      password: 'password123',
    });

    const res = await request(app.getHttpServer())
      .get('/permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
  });

  it("Admin can't remove manage:all from admin role (self-lockout protection) -> 403", async () => {
    const adminToken = await login({
      orgSlug: 'acme',
      email: 'admin@acme.test',
      password: 'password123',
    });

    // 1) fetch roles to find admin role id (assuming GET /roles exists)
    const rolesRes = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const roles = (rolesRes.body.items ?? rolesRes.body) as Array<{
      id: string;
      name: string;
    }>;
    const adminRole = roles.find((r) => r.name === 'admin');
    expect(adminRole).toBeDefined();

    // 2) attempt to set permissions WITHOUT manage:all -> must be forbidden
    // We'll pick a harmless permission id from GET /permissions that is NOT manage:all
    const permsRes = await request(app.getHttpServer())
      .get('/permissions?page=1&limit=200')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const perms = (permsRes.body.items ?? permsRes.body) as Array<{
      id: string;
      action: string;
      subject: string;
    }>;

    const nonManageAll = perms.find(
      (p) => !(p.action === 'manage' && p.subject === 'all'),
    );
    expect(nonManageAll).toBeDefined();

    await request(app.getHttpServer())
      .put(`/roles/${adminRole!.id}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissionIds: [nonManageAll!.id] })
      .expect(403);
  });
});
