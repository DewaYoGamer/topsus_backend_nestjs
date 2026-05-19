import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Res, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { MahasiswaService } from './mahasiswa.service';
import { CreateMahasiswaDto, UpdateMahasiswaDto, AssignPembimbingDto } from './dto/mahasiswa.dto';
import { CurrentUser, JwtUser, Roles } from '../common/decorators';

@Controller('mahasiswa')
export class MahasiswaController {
  constructor(private mhsService: MahasiswaService) {}

  @Get()
  async list(@CurrentUser() user: JwtUser, @Res({ passthrough: true }) res: Response) {
    const { data, fromCache } = await this.mhsService.findAll(user.role, user.id);
    res.setHeader('X-Cache', fromCache ? 'HIT' : 'MISS');
    return data;
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMahasiswaDto) {
    return this.mhsService.create(dto);
  }

  @Get('me')
  @Roles('mahasiswa')
  async me(@CurrentUser() user: JwtUser) {
    return this.mhsService.findMe(user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.mhsService.findOne(id, user.role, user.id);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMahasiswaDto) {
    return this.mhsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.mhsService.remove(id);
  }

  @Patch(':id/pembimbing')
  @Roles('admin')
  async assignPembimbing(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignPembimbingDto) {
    return this.mhsService.assignPembimbing(id, dto);
  }
}
