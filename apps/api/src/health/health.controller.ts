import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.types.js';
import { HealthService } from './health.service.js';

@Controller('api/health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  async check() {
    return this.health.check();
  }
}
