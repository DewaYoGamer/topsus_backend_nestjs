import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, DOSEN_LIST } from '../common/cache/cache.service';
import { CreateDosenDto, UpdateDosenDto } from './dto/dosen.dto';

@Injectable()
export class DosenService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll(): Promise<{ data: any[]; fromCache: boolean }> {
    const cached = await this.cache.getJson<any[]>(DOSEN_LIST);
    if (cached) return { data: cached, fromCache: true };

    const rows = await this.prisma.dosen.findMany({ orderBy: { id: 'asc' } });
    const data = rows.map(this.serialize);
    await this.cache.setJson(DOSEN_LIST, data);
    return { data, fromCache: false };
  }

  async findOne(id: number) {
    const d = await this.prisma.dosen.findUnique({ where: { id } });
    if (!d) throw new HttpException({ detail: 'Dosen tidak ditemukan' }, HttpStatus.NOT_FOUND);
    return this.serialize(d);
  }

  async findMe(id: number) {
    const d = await this.prisma.dosen.findUnique({
      where: { id },
      include: { mahasiswa: { select: { id: true, nama: true, nim: true, email: true } } },
    });
    return {
      ...this.serialize(d),
      mahasiswa_bimbingan: d.mahasiswa,
    };
  }

  async create(dto: CreateDosenDto) {
    const hashed = await bcrypt.hash(dto.password, 12);
    try {
      const d = await this.prisma.dosen.create({
        data: { nama: dto.nama, nip: dto.nip, email: dto.email, password: hashed, role: dto.role || 'dosen' },
      });
      await this.cache.invalidateDosenList();
      return this.serialize(d);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new HttpException({ detail: 'NIP atau email sudah dipakai' }, HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateDosenDto) {
    const existing = await this.prisma.dosen.findUnique({ where: { id } });
    if (!existing) throw new HttpException({ detail: 'Dosen tidak ditemukan' }, HttpStatus.NOT_FOUND);

    const data: any = {};
    if (dto.nama !== undefined) data.nama = dto.nama;
    if (dto.nip !== undefined) data.nip = dto.nip;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, 12);

    try {
      const d = await this.prisma.dosen.update({ where: { id }, data });
      await this.cache.invalidateDosenList();
      return this.serialize(d);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new HttpException({ detail: 'NIP atau email sudah dipakai' }, HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new HttpException({ detail: 'Tidak bisa menghapus akun sendiri' }, HttpStatus.BAD_REQUEST);
    }
    const existing = await this.prisma.dosen.findUnique({ where: { id } });
    if (!existing) throw new HttpException({ detail: 'Dosen tidak ditemukan' }, HttpStatus.NOT_FOUND);
    await this.prisma.dosen.delete({ where: { id } });
    await this.cache.invalidateDosenList();
  }

  private serialize(d: any) {
    return {
      id: d.id,
      nama: d.nama,
      nip: d.nip,
      email: d.email,
      role: d.role,
      created_at: d.created_at?.toISOString?.() ?? d.created_at,
    };
  }
}
