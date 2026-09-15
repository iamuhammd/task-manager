import request from 'supertest';
import app from '../src/app';

describe('App API Endpoints', () => {
  it('GET /health should return status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.message).toContain('Task Manager API');
  });

  it('GET /api/v1/auth/register should fail on unsupported method or missing body', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
