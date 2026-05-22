import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction, CodingSystem } from '@tpt-doctor/shared';

@Injectable()
export class ClinicalCodingService {
  // === SNOMED CT ===

  async searchSnomedCt(query: string, page: number = 1, pageSize: number = 20) {
    const where = {
      OR: [
        { conceptId: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
      ],
      isActive: true,
    };

    const [data, total] = await Promise.all([
      prisma.snomedCtCode.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { description: 'asc' } }),
      prisma.snomedCtCode.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async getSnomedCtByParent(parentId: string) {
    return prisma.snomedCtCode.findMany({
      where: { parentId, isActive: true },
      orderBy: { description: 'asc' },
    });
  }

  // === Code Mapping ===

  async findMappings(sourceSystem: string, sourceCode: string) {
    return prisma.codeMapping.findMany({
      where: { sourceSystem, sourceCode, isActive: true },
    });
  }

  async mapCode(sourceSystem: string, sourceCode: string, targetSystem: string) {
    const mapping = await prisma.codeMapping.findFirst({
      where: { sourceSystem, sourceCode, targetSystem, isActive: true },
    });
    if (!mapping) return null;

    // Fetch the target code description
    if (targetSystem === 'ICD10') {
      const icd10 = await prisma.icd10Code.findFirst({ where: { code: mapping.targetCode } });
      return { ...mapping, targetDescription: icd10?.description };
    }
    if (targetSystem === 'SNOMED_CT') {
      const snomed = await prisma.snomedCtCode.findFirst({ where: { conceptId: mapping.targetCode } });
      return { ...mapping, targetDescription: snomed?.description };
    }

    return mapping;
  }

  async createMapping(data: any, tenantId: string, userId: string) {
    const mapping = await prisma.codeMapping.create({
      data: {
        sourceSystem: data.sourceSystem,
        sourceCode: data.sourceCode,
        targetSystem: data.targetSystem,
        targetCode: data.targetCode,
        mappingType: data.mappingType || 'EQUIVALENT',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'CodeMapping', resourceId: mapping.id, details: { source: `${data.sourceSystem}:${data.sourceCode}`, target: `${data.targetSystem}:${data.targetCode}` }, ipAddress: '0.0.0.0' });

    return mapping;
  }

  async importSnomedCodes(codes: any[], tenantId: string, userId: string) {
    // Bulk import SNOMED CT codes
    const results: Array<{ conceptId: string; status: string; error?: string }> = [];
    for (const code of codes) {
      try {
        const existing = await prisma.snomedCtCode.findUnique({ where: { conceptId: code.conceptId } });
        if (existing) {
          await prisma.snomedCtCode.update({ where: { conceptId: code.conceptId }, data: { description: code.description, parentId: code.parentId || null, isActive: code.isActive ?? true } });
        } else {
          await prisma.snomedCtCode.create({ data: { conceptId: code.conceptId, description: code.description, parentId: code.parentId || null } });
        }
        results.push({ conceptId: code.conceptId, status: 'imported' });
      } catch (error: any) {
        results.push({ conceptId: code.conceptId, status: 'failed', error: error.message });
      }
    }

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'SnomedCtCode', resourceId: 'bulk', details: { imported: results.filter(r => r.status === 'imported').length, failed: results.filter(r => r.status === 'failed').length }, ipAddress: '0.0.0.0' });

    return { results, totalImported: results.filter(r => r.status === 'imported').length, totalFailed: results.filter(r => r.status === 'failed').length };
  }

  // === Auto-suggestion ===

  async suggestCodes(clinicalText: string) {
    // Simple keyword-based suggestion - in production this would use NLP/ML
    const keywords = clinicalText.toLowerCase().split(/\s+/).filter(k => k.length > 3);

    const icdResults = await prisma.icd10Code.findMany({
      where: {
        isActive: true,
        OR: keywords.map(k => ({ description: { contains: k, mode: 'insensitive' } })),
      },
      take: 10,
    });

    const snomedResults = await prisma.snomedCtCode.findMany({
      where: {
        isActive: true,
        OR: keywords.map(k => ({ description: { contains: k, mode: 'insensitive' } })),
      },
      take: 10,
    });

    return {
      icd10: icdResults.map(r => ({ code: r.code, description: r.description, system: 'ICD10' })),
      snomedCt: snomedResults.map(r => ({ code: r.conceptId, description: r.description, system: 'SNOMED_CT' })),
    };
  }

  // === Code lookup (unified) ===

  async lookupCode(system: string, code: string) {
    switch (system) {
      case 'ICD10': {
        const icd10 = await prisma.icd10Code.findFirst({ where: { code, isActive: true } });
        if (!icd10) throw new NotFoundException('ICD-10 code not found');
        return { system: 'ICD10', code: icd10.code, description: icd10.description, category: icd10.category };
      }
      case 'SNOMED_CT': {
        const snomed = await prisma.snomedCtCode.findFirst({ where: { conceptId: code, isActive: true } });
        if (!snomed) throw new NotFoundException('SNOMED CT code not found');
        return { system: 'SNOMED_CT', code: snomed.conceptId, description: snomed.description };
      }
      case 'LOINC': {
        // LOINC codes are embedded in lab orders/panels - could expand to a LOINC directory
        throw new NotFoundException('LOINC lookup not yet implemented');
      }
      case 'CPT': {
        const cpt = await prisma.cptCode.findFirst({ where: { code, isActive: true } });
        if (!cpt) throw new NotFoundException('CPT code not found');
        return { system: 'CPT', code: cpt.code, description: cpt.description, category: cpt.category };
      }
      default:
        throw new NotFoundException(`Unknown coding system: ${system}`);
    }
  }

  async getStats() {
    const [icd10Count, snomedCount, cptCount, mappingCount] = await Promise.all([
      prisma.icd10Code.count({ where: { isActive: true } }),
      prisma.snomedCtCode.count({ where: { isActive: true } }),
      prisma.cptCode.count({ where: { isActive: true } }),
      prisma.codeMapping.count({ where: { isActive: true } }),
    ]);

    return {
      icd10: icd10Count,
      snomedCt: snomedCount,
      cpt: cptCount,
      codeMappings: mappingCount,
    };
  }
}