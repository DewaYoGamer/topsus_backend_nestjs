import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { CreateMahasiswaDto, UpdateMahasiswaDto, AssignPembimbingDto } from './dto/mahasiswa.dto';

@Injectable()
export class MahasiswaService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll(role: string, userId: number): Promise<{ data: any[]; fromCache: boolean }> {
    if (role === 'mahasiswa') {
      throw new HttpException({ detail: 'Forbidden' }, HttpStatus.FORBIDDEN);
    }

    const cacheKey = this.cache.mhsListKey(role, userId);
    if (cacheKey) {
      const cached = await this.cache.getJson<any[]>(cacheKey);
      if (cached) return { data: cached, fromCache: true };
    }

    const where = role === 'dosen' ? { dosen_pembimbing_id: userId } : {};
    const rows = await this.prisma.mahasiswa.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { dosen_pembimbing: { select: { id: true, nama: true, nip: true, email: true } } },
    });
    const data = rows.map(this.serialize);
    if (cacheKey) await this.cache.setJson(cacheKey, data);
    return { data, fromCache: false };
  }

  async findOne(id: number, role: string, userId: number) {
    const m = await this.prisma.mahasiswa.findUnique({
      where: { id },
      include: { dosen_pembimbing: { select: { id: true, nama: true, nip: true, email: true } } },
    });
    if (!m) throw new HttpException({ detail: 'Mahasiswa tidak ditemukan' }, HttpStatus.NOT_FOUND);
    if (role === 'admin') return this.serialize(m);
    if (role === 'dosen' && m.dosen_pembimbing_id === userId) return this.serialize(m);
    throw new HttpException({ detail: 'Forbidden' }, HttpStatus.FORBIDDEN);
  }

  async findMe(id: number) {
    const m = await this.prisma.mahasiswa.findUnique({
      where: { id },
      include: { dosen_pembimbing: { select: { id: true, nama: true, nip: true, email: true } } },
    });
    return this.serialize(m);
  }

  async create(dto: CreateMahasiswaDto) {
    if (dto.dosen_pembimbing_id != null) {
      const dosen = await this.prisma.dosen.findUnique({ where: { id: dto.dosen_pembimbing_id } });
      if (!dosen) throw new HttpException({ detail: 'Dosen pembimbing tidak ditemukan' }, HttpStatus.BAD_REQUEST);
    }
    const hashed = await bcrypt.hash(dto.password, 12);
    try {
      const m = await this.prisma.mahasiswa.create({
        data: {
          nama: dto.nama,
          nim: dto.nim,
          email: dto.email,
          password: hashed,
          dosen_pembimbing_id: dto.dosen_pembimbing_id ?? null,
        },
        include: { dosen_pembimbing: { select: { id: true, nama: true, nip: true, email: true } } },
      });
      await this.cache.invalidateMahasiswaAll();
      return this.serialize(m);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new HttpException({ detail: 'NIM atau email sudah dipakai' }, HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateMahasiswaDto) {
    const existing = await this.prisma.mahasiswa.findUnique({ where: { id } });
    if (!existing) throw new HttpException({ detail: 'Mahasiswa tidak ditemukan' }, HttpStatus.NOT_FOUND);

    const data: any = {};
    if (dto.nama !== undefined) data.nama = dto.nama;
    if (dto.nim !== undefined) data.nim = dto.nim;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, 12);

    try {
      const m = await this.prisma.mahasiswa.update({
        where: { id },
        data,
        include: { dosen_pembimbing: { select: { id: true, nama: true, nip: true, email: true } } },
      });
      await this.cache.invalidateMahasiswaAll();
      return this.serialize(m);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new HttpException({ detail: 'NIM atau email sudah dipakai' }, HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async remove(id: number) {
    const existing = await this.prisma.mahasiswa.findUnique({ where: { id } });
    if (!existing) throw new HttpException({ detail: 'Mahasiswa tidak ditemukan' }, HttpStatus.NOT_FOUND);
    await this.prisma.mahasiswa.delete({ where: { id } });
    await this.cache.invalidateMahasiswaAll();
  }

  async assignPembimbing(id: number, dto: AssignPembimbingDto) {
    const m = await this.prisma.mahasiswa.findUnique({ where: { id } });
    if (!m) throw new HttpException({ detail: 'Mahasiswa tidak ditemukan' }, HttpStatus.NOT_FOUND);

    if (dto.dosen_id != null) {
      const dosen = await this.prisma.dosen.findUnique({ where: { id: dto.dosen_id } });
      if (!dosen) throw new HttpException({ detail: 'Dosen tidak ditemukan' }, HttpStatus.BAD_REQUEST);
    }

    const updated = await this.prisma.mahasiswa.update({
      where: { id },
      data: { dosen_pembimbing_id: dto.dosen_id ?? null },
      include: { dosen_pembimbing: { select: { id: true, nama: true, nip: true, email: true } } },
    });
    await this.cache.invalidateMahasiswaAll();
    return this.serialize(updated);
  }

  private serialize(m: any) {
    return {
      id: m.id,
      nama: m.nama,
      nim: m.nim,
      email: m.email,
      role: m.role,
      dosen_pembimbing_id: m.dosen_pembimbing_id,
      dosen_pembimbing: m.dosen_pembimbing || null,
      created_at: m.created_at?.toISOString?.() ?? m.created_at,
    };
  }
}
