import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // هذه العلامة تجعل الموديول متاحاً في أي مكان بالتطبيق دون الحاجة لعمل Import مجدداً
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // يجب تصدير الخدمة لتستطيع الموديولات الأخرى استخدامها
})
export class PrismaModule {}