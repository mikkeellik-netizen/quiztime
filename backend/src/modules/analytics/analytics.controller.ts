import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** GET /api/analytics/sessions — список всех игр ведущего */
  @Get('sessions')
  listSessions(@CurrentUser() user: { id: string }) {
    return this.analyticsService.listSessions(user.id);
  }

  /** GET /api/analytics/sessions/:id — детали сессии */
  @Get('sessions/:id')
  getSession(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.analyticsService.getSessionDetail(id, user.id);
  }

  /** GET /api/analytics/sessions/:id/export/csv — CSV-экспорт */
  @Get('sessions/:id/export/csv')
  async exportCsv(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const csv = await this.analyticsService.exportCsv(id, user.id);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="session-${id}.csv"`,
    });
    // BOM for Excel
    res.send('﻿' + csv);
  }
}
