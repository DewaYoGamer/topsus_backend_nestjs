import { Controller, Get, Post, Put, Delete, Param, Body, Res, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { DosenService } from './dosen.service';
import { CreateDosenDto, UpdateDosenDto } from './dto/dosen.dto';
import { CurrentUser, JwtUser, Roles } from '../common/decorators';

@Controller('dosen')
export class DosenController {
  constructor(private dosenService: DosenService) {}

  @Get()
  @Roles('admin')
  async list(@Res({ passthrough: true }) res: Response) {
    const { data, fromCache } = await this.dosenService.findAll();
    res.setHeader('X-Cache', fromCache ? 'HIT' : 'MISS');
    return data;
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDosenDto) {
    return this.dosenService.create(dto);
  }

  @Get('me')
  @Roles('dosen')
  async me(@CurrentUser() user: JwtUser) {
    return this.dosenService.findMe(user.id);
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dosenService.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDosenDto) {
    return this.dosenService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    await this.dosenService.remove(id, user.id);
  }
}
