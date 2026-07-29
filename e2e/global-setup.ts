export default async function globalSetup() {
  (process.env as unknown as { NODE_ENV: string }).NODE_ENV = 'test';
  process.env.ENABLE_MOCK_AUTH = 'true';
  process.env.PROPERTY_DATA_PROVIDER = 'mock';
}
