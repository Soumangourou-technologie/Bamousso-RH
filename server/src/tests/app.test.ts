import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app'; // Importe ton application Express

describe('GET /api', () => {
  it('should respond with a welcome message', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Bamousso RH API is running' });
  });
});
