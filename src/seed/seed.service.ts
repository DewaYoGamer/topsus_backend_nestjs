import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger('Seed');

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  private async seed() {
    // Admin
    if (!(await this.prisma.dosen.findUnique({ where: { email: 'admin@kampus.ac.id' } }))) {
      await this.prisma.dosen.create({
        data: { nama: 'Administrator', nip: '0000000000', email: 'admin@kampus.ac.id', password: await bcrypt.hash('admin123', 12), role: 'admin' },
      });
      this.log.log('+ created admin@kampus.ac.id / admin123');
    }

    // Dosen Budi
    if (!(await this.prisma.dosen.findUnique({ where: { email: 'budi@kampus.ac.id' } }))) {
      await this.prisma.dosen.create({
        data: { nama: 'Dr. Budi Santoso', nip: '1987654321', email: 'budi@kampus.ac.id', password: await bcrypt.hash('dosen123', 12), role: 'dosen' },
      });
      this.log.log('+ created budi@kampus.ac.id / dosen123');
    }

    const budi = await this.prisma.dosen.findUnique({ where: { email: 'budi@kampus.ac.id' } });

    // Mahasiswa Ani
    if (!(await this.prisma.mahasiswa.findUnique({ where: { email: 'ani@kampus.ac.id' } }))) {
      await this.prisma.mahasiswa.create({
        data: { nama: 'Ani Wijaya', nim: '2021001', email: 'ani@kampus.ac.id', password: await bcrypt.hash('mhs123', 12), dosen_pembimbing_id: budi?.id ?? null },
      });
      this.log.log('+ created ani@kampus.ac.id / mhs123');
    }

    // Mahasiswa Chandra
    if (!(await this.prisma.mahasiswa.findUnique({ where: { email: 'chandra@kampus.ac.id' } }))) {
      await this.prisma.mahasiswa.create({
        data: { nama: 'Chandra Pratama', nim: '2021002', email: 'chandra@kampus.ac.id', password: await bcrypt.hash('mhs123', 12), dosen_pembimbing_id: null },
      });
      this.log.log('+ created chandra@kampus.ac.id / mhs123');
    }

    this.log.log('seed done.');
  }
}
