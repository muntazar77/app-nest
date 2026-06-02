import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { afterAll, beforeAll, describe, it ,jest} from '@jest/globals';
jest.setTimeout(30000);

type LoginResponse = { accessToken: string };
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;

  const password = 'password123';

  // IMPORTANT: match your seeded org slugs + seeded admin emails
  const orgA = { slug: 'acme', adminEmail: 'admin@acme.test' };
  const orgB = { slug: 'org-2', adminEmail: 'admin@org-2.test' };

  async function login(orgSlug: string, email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ orgSlug, email, password })
      .expect(201);

    const body = res.body as LoginResponse;
    expect(body).toHaveProperty('accessToken');
    expect(typeof body.accessToken).toBe('string');
    return body.accessToken;
  }

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

  it('Org A creates department; Org B cannot list it or access it by id', async () => {
    const tokenA = await login(orgA.slug, orgA.adminEmail);
    const tokenB = await login(orgB.slug, orgB.adminEmail);

    // A creates a department
    const name = `dep_${Date.now()}`;
    const created = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name, title: 'Tenant A Department' })
      .expect(201);

    expect(created.body).toHaveProperty('id');
    const depId = created.body.id as string;

    // A sees it in list
    const listA = await request(app.getHttpServer())
      .get('/departments?page=1&limit=200')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const itemsA = (listA.body.items ?? listA.body) as any[];
    expect(Array.isArray(itemsA)).toBe(true);
    expect(itemsA.find((d) => d.id === depId)).toBeDefined();

    // B does NOT see it in list
    const listB = await request(app.getHttpServer())
      .get('/departments?page=1&limit=200')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const itemsB = (listB.body.items ?? listB.body) as any[];
    expect(Array.isArray(itemsB)).toBe(true);
    expect(itemsB.find((d) => d.id === depId)).toBeUndefined();

    // B cannot access by id (404 preferred: do not leak existence)
    await request(app.getHttpServer())
      .get(`/departments/${depId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });
});

function expect(body: any) {
    throw new Error('Function not implemented.');
}
