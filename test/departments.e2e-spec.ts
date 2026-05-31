import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type LoginResponse = { accessToken: string };

describe('Departments RBAC (e2e)', () => {
  let app: INestApplication;

  const adminCreds = { email: 'admin@example.com', password: 'password123' };
  const userCreds = { email: 'user@example.com', password: 'password123' };

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

async function login(email: string): Promise<string> {
  const password = 'password123';

  // try (email,password) first
  let res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });

  // fallback to (email,passwordHash) if your DTO is weirdly named
  if (res.status === 400) {
    res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, passwordHash: password });
  }

  if (res.status !== 201) {
    // print body so you see the real validation error
    // eslint-disable-next-line no-console
    console.log('LOGIN FAILED', res.status, res.body);
  }

  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('accessToken');
  return res.body.accessToken as string;
}

  it('GET /departments without token -> 401', async () => {
    await request(app.getHttpServer()).get('/departments').expect(401);
  });

  it('POST /departments with normal user token -> 403', async () => {
    const token = await login(userCreds.email);

    await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `dep_${Date.now()}`, title: 'Should fail' })
      .expect(403);
  });

  it('Admin can create department -> 201, list it, soft-delete it, and it disappears from list', async () => {
    const adminToken = await login(adminCreds.email);

    const name = `dep_${Date.now()}`;

    // create
    const createRes = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, title: 'QA Department' })
      .expect(201);

    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.name).toBe(name);

    const createdId = createRes.body.id as string;

    // list (paginated shape)
    const listRes = await request(app.getHttpServer())
      .get('/departments?page=1&limit=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body).toHaveProperty('items');
    expect(listRes.body).toHaveProperty('meta');
    expect(Array.isArray(listRes.body.items)).toBe(true);

    const found = (listRes.body.items as any[]).find((d) => d.id === createdId);
    expect(found).toBeDefined();

    // soft delete
    await request(app.getHttpServer())
      .delete(`/departments/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // list again -> should be gone (because isActive=false)
    const listRes2 = await request(app.getHttpServer())
      .get('/departments?page=1&limit=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found2 = (listRes2.body.items as any[]).find((d) => d.id === createdId);
    expect(found2).toBeUndefined();
  });
});