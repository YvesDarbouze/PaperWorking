import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { MarketplaceService } from './marketplace.service.js';

const followSchema = z.object({
  targetUid: z.string().optional(),
  investorId: z.string().optional(),
  id: z.string().optional(),
});

@Controller('api/marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Public()
  @Get('listings')
  listings() {
    return this.marketplace.listings();
  }

  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return this.marketplace.profile(user);
  }

  @Public()
  @Get('investors')
  investors(@Query('q') q?: string, @CurrentUser() user?: AuthUser) {
    return this.marketplace.investors(q, user);
  }

  @Public()
  @Get('investors/:id')
  investorById(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.marketplace.investorById(id, user);
  }

  @Post('investors/follow')
  follow(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(followSchema)) body: z.infer<typeof followSchema>,
  ) {
    return this.marketplace.follow(user, body);
  }
}

@Controller('api/investor-followers')
export class InvestorFollowersController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.marketplace.listFollowers(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(followSchema)) body: z.infer<typeof followSchema>,
  ) {
    return this.marketplace.createFollower(user, body);
  }
}
