import { disconnectRedis } from './lib/redis';

afterAll(async () => {
  await disconnectRedis();
});
