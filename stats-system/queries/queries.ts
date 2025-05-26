import { PrismaClient } from '../../prisma/client/stats-system';

const prisma = new PrismaClient();

export async function getCertificates(params: any): Promise<any> {
  try {
    // Extract filters and pagination parameters
    const { areaName, department, startDate, endDate, coStatus, noticeStatus, rtn, paginated, modality, dateType } = params;

    // Determine pagination values
    let page = 0;
    let limit = 0;
    if (paginated === 'true') {
      page = parseInt(params.page || '1', 10); // Default to page 1 if not provided
      limit = parseInt(params.limit || '100', 10); // Default to 100 items if not provided
    }

    // Build filters dynamically
    const filters: any = {};

    if (areaName) {
      filters.areaName = { contains: areaName };
    }

    if(modality) {
      filters.modality = modality;
    }

    if (rtn) {
      filters.concessionaireRtn = { contains: rtn };
    }

    if (department) {
      filters.department = { contains: department };
    }

    if (coStatus) {
      filters.coStatus = coStatus;
    }

    if (noticeStatus) {
      filters.noticeStatusDescription = noticeStatus;
    }

    if (startDate && endDate && dateType) {
      // Apply date filter based on dateType
      if (dateType === 'certificateExpiration') {
        filters['certificateExpirationDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      } else if (dateType === 'permissionExpiration') {
        filters['permissionExpirationDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      } else if (dateType === 'payment') {
        filters['paymentDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      }
    }

    // Use distinct to get unique records by noticeCode at database level
    const data = await prisma.certificates.findMany({
      where: filters,
      distinct: ['noticeCode'],
      skip: paginated === 'true' ? (page - 1) * limit : undefined,
      take: paginated === 'true' ? limit : undefined,
    });

    // Count total unique records for pagination
    const totalUniqueRecords = await prisma.certificates.findMany({
      where: filters,
      distinct: ['noticeCode'],
      select: { id: true }
    });
    const total = paginated === 'true' ? totalUniqueRecords.length : data.length;

    // Return the response
    return {
      data,
      total,
      page: paginated === 'true' ? page : undefined,
      pages: paginated === 'true' ? Math.ceil(total / limit) : undefined,
    };
  } catch (error: any) {
    console.error('Error retrieving data:', error);
    throw error.message;
  }
}

export async function getDashboardAnalytics(params: any): Promise<any> {
  try {
    const { areaName, department, startDate, endDate, coStatus, noticeStatus, rtn, modality, dateType } = params;

    // Build base filters
    const filters: any = {};
    
    if (areaName) filters.areaName = { contains: areaName };
    if (modality) filters.modality = modality;
    if (rtn) filters.concessionaireRtn = { contains: rtn };
    if (department) filters.department = { contains: department };
    if (coStatus) filters.coStatus = coStatus;
    if (noticeStatus) filters.noticeStatusDescription = noticeStatus;

    if (startDate && endDate && dateType) {
      if (dateType === 'certificateExpiration') {
        filters['certificateExpirationDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      } else if (dateType === 'permissionExpiration') {
        filters['permissionExpirationDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      } else if (dateType === 'payment') {
        filters['paymentDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      }
    }

    // Get filtered certificates for basic KPIs and chart data that need filtering
    const certificates = await prisma.certificates.findMany({
      where: filters,
      distinct: ['noticeCode'],
    });

    const now = new Date();
    const threeMonthsFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    const twelveMonthsFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));

    // Basic KPIs from filtered data - using distinct noticeCode
    const uniqueNoticeCodes = new Map();
    certificates.forEach(cert => {
      if (cert.noticeCode && !uniqueNoticeCodes.has(cert.noticeCode)) {
        uniqueNoticeCodes.set(cert.noticeCode, cert);
      }
    });
    
    const uniqueCertificates = Array.from(uniqueNoticeCodes.values());
    
    const basicKpis = {
      totalPaid: uniqueCertificates
        .filter(cert => cert.paymentDate && cert.noticeStatusDescription === "PAGADO")
        .reduce((sum, cert) => sum + (cert.totalNoticeAmount || 0), 0),
      
      totalOwed: uniqueCertificates
        .filter(cert => cert.noticeStatusDescription === 'ACTIVO')
        .reduce((sum, cert) => sum + (cert.totalNoticeAmount || 0), 0)
    };

    // Optimized queries for global KPIs (no filtering - all certificates)
    const upcomingExpirationsResult = await prisma.certificates.aggregate({
      _count: {
        noticeCode: true
      },
      where: {
        OR: [
          {
            certificateExpirationDate: {
              gte: now.toISOString(),
              lte: threeMonthsFromNow.toISOString()
            }
          },
          {
            permissionExpirationDate: {
              gte: now.toISOString(),
              lte: threeMonthsFromNow.toISOString()
            }
          }
        ]
      }
    });

    // For money calculations, we need to use raw SQL to ensure DISTINCT noticeCode
    const totalPaidLast12MonthsResult = await prisma.$queryRaw`
      SELECT SUM(totalNoticeAmount) as totalAmount
      FROM (
        SELECT DISTINCT noticeCode, totalNoticeAmount
        FROM certificates 
        WHERE paymentDate >= ${twelveMonthsAgo.toISOString()}
          AND paymentDate <= ${now.toISOString()}
          AND noticeStatusDescription = 'PAGADO'
          AND noticeCode IS NOT NULL
      )
    `;

    const totalProjectedNext12MonthsResult = await prisma.$queryRaw`
      SELECT SUM(totalNoticeAmount) as totalAmount
      FROM (
        SELECT DISTINCT noticeCode, totalNoticeAmount
        FROM certificates 
        WHERE (
          (certificateExpirationDate >= ${now.toISOString()} AND certificateExpirationDate <= ${twelveMonthsFromNow.toISOString()})
          OR 
          (permissionExpirationDate >= ${now.toISOString()} AND permissionExpirationDate <= ${twelveMonthsFromNow.toISOString()})
        )
        AND noticeCode IS NOT NULL
      )
    `;

    // Optimized query for monthly income chart (all paid certificates with DISTINCT noticeCode)
    const monthlyIncomeData = await prisma.$queryRaw`
      SELECT 
        month,
        SUM(totalNoticeAmount) as totalAmount
      FROM (
        SELECT DISTINCT 
          noticeCode, 
          totalNoticeAmount,
          strftime('%Y-%m', paymentDate) as month
        FROM certificates 
        WHERE noticeStatusDescription = 'PAGADO' 
          AND paymentDate IS NOT NULL
          AND noticeCode IS NOT NULL
      )
      GROUP BY month
      ORDER BY month DESC
      LIMIT 24
    `;

    // Get projection data directly from database (ALL certificates, not filtered)
    const projectionCertificates = await prisma.certificates.findMany({
      where: {
        OR: [
          {
            certificateExpirationDate: {
              gte: now.toISOString(),
              lte: twelveMonthsFromNow.toISOString()
            }
          },
          {
            permissionExpirationDate: {
              gte: now.toISOString(),
              lte: twelveMonthsFromNow.toISOString()
            }
          }
        ]
      },
      distinct: ['noticeCode'],
    });

    console.log('Found', projectionCertificates.length, 'certificates for projection from DB');

    const kpis = {
      ...basicKpis,
      upcomingExpirations: upcomingExpirationsResult._count.noticeCode || 0,
      totalPaidLast12Months: Number((totalPaidLast12MonthsResult as any)[0]?.totalAmount) || 0,
      totalProjectedNext12Months: Number((totalProjectedNext12MonthsResult as any)[0]?.totalAmount) || 0
    };

    // Calculate chart data using unique certificates
    const chartData = {
      debtDistribution: uniqueCertificates.reduce((acc: any, cert) => {
        const status = cert.noticeStatusDescription || "NO DEFINIDO";
        acc[status] = (acc[status] || 0) + (cert.totalNoticeAmount || 0);
        return acc;
      }, {}),

      debtByDepartment: uniqueCertificates
        .filter(cert => cert.noticeStatusDescription === "ACTIVO")
        .reduce((acc: any, cert) => {
          const department = cert.department || "NO DEFINIDO";
          acc[department] = (acc[department] || 0) + (cert.totalNoticeAmount || 0);
          return acc;
        }, {}),

      paidByMonth: (monthlyIncomeData as any[]).reduce((acc: any, row: any) => {
        acc[row.month] = Number(row.totalAmount) || 0;
        return acc;
      }, {}),

      projectionsByMonth: (() => {
        console.log('Starting projection calculation for next 12 months');
        
        const projectionData: { [key: string]: number } = {};
        
        // Initialize all 12 months with 0 (proper month calculation)
        for (let i = 0; i < 12; i++) {
          const futureDate = new Date(now);
          futureDate.setMonth(futureDate.getMonth() + i);
          const monthKey = String(futureDate.getMonth() + 1).padStart(2, '0') + '-' + futureDate.getFullYear();
          projectionData[monthKey] = 0;
        }
        
        console.log('Initialized months:', Object.keys(projectionData));
        
        // Calculate projections by month using database results
        projectionCertificates.forEach(cert => {
          const certExpDate = cert.certificateExpirationDate ? new Date(cert.certificateExpirationDate) : null;
          const permExpDate = cert.permissionExpirationDate ? new Date(cert.permissionExpirationDate) : null;

          const validDate = certExpDate && certExpDate >= now && certExpDate <= twelveMonthsFromNow
            ? certExpDate
            : permExpDate && permExpDate >= now && permExpDate <= twelveMonthsFromNow
            ? permExpDate
            : null;

          if (validDate) {
            const monthKey = String(validDate.getMonth() + 1).padStart(2, '0') + '-' + validDate.getFullYear();
            projectionData[monthKey] = (projectionData[monthKey] || 0) + (cert.totalNoticeAmount || 0);
            console.log('Added', cert.totalNoticeAmount, 'to month', monthKey);
          }
        });
        
        console.log('Final projection data:', projectionData);
        return projectionData;
      })(),

      certificateByModality: uniqueCertificates.reduce((acc: any, cert) => {
        const modality = cert.modality || 'DESCONOCIDO';
        if (!acc[modality]) {
          acc[modality] = { active: 0, paid: 0 };
        }
        if (cert.noticeStatusDescription === 'ACTIVO') {
          acc[modality].active += cert.totalNoticeAmount || 0;
        } else if (cert.noticeStatusDescription === 'PAGADO') {
          acc[modality].paid += cert.totalNoticeAmount || 0;
        }
        return acc;
      }, {})
    };

    return {
      kpis,
      chartData,
      total: uniqueCertificates.length
    };
  } catch (error: any) {
    console.error('Error retrieving dashboard analytics:', error);
    throw error.message;
  }
}

export async function getFinesAnalytics(params: any): Promise<any> {
  try {
    const { startDate, endDate, region, status, department, municipality, origin, dniRtn, operationId, companyName } = params;

    // Build base filters for filtered data
    const filters: any = {};
    if (startDate && endDate) {
      filters.startDate = {
        gte: new Date(startDate).toISOString(),
        lte: new Date(endDate).toISOString(),
      };
    }
    if (status) filters.fineStatus = status;
    if (companyName) filters.companyName = { contains: companyName };
    if (dniRtn) filters.dniRtn = { contains: dniRtn };
    if (region) filters.region = { contains: region };
    if (department) filters.department = { contains: department };
    if (municipality) filters.municipality = { contains: municipality };
    if (origin) filters.origin = { contains: origin };
    if (operationId) filters.operationId = operationId;

    // Get filtered fines for KPIs and charts that need filtering
    const filteredFines = await prisma.fines.findMany({
      where: filters,
    });

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    // Get ALL fines for global KPIs (no filters) - MOVE THIS BEFORE KPIs calculation
    const globalActiveFinesResult = await prisma.fines.aggregate({
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      },
      where: {
        fineStatus: 'ACTIVA'
      }
    });

    const globalAllFines = await prisma.fines.findMany({
      where: {}  // No filters - all fines
    });

    // Calculate KPIs - both filtered and global
    const kpis = {
      // Filtered KPIs (based on user filters)
      filtered: {
        totalFines: filteredFines.length,
        totalFineRevenue: filteredFines
          .filter(fine => fine.fineStatus === 'PAGADA')
          .reduce((sum, fine) => sum + (fine.totalAmount || 0), 0),
        totalAmountDue: filteredFines
          .filter(fine => fine.fineStatus === 'ACTIVA')
          .reduce((sum, fine) => sum + (fine.totalAmount || 0), 0),
        activeFines: filteredFines.filter(fine => fine.fineStatus === 'ACTIVA').length,
        paidFines: filteredFines.filter(fine => fine.fineStatus === 'PAGADA').length,
        cancelledFines: filteredFines.filter(fine => fine.fineStatus === 'ANULADA').length
      },
      // Global KPIs (all fines, no filters)
      global: {
        activeFines: globalActiveFinesResult._count.id || 0,
        totalAmountDue: globalActiveFinesResult._sum.totalAmount || 0,
        totalFines: globalAllFines.length
      }
    };

    // Optimized query for monthly revenue (all paid fines, not filtered)
    const monthlyRevenueData = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', startDate) as month,
        SUM(totalAmount) as totalAmount
      FROM fines 
      WHERE fineStatus = 'PAGADA' 
        AND startDate IS NOT NULL
      GROUP BY strftime('%Y-%m', startDate)
      ORDER BY month DESC
      LIMIT 24
    `;

    // Get fines from last 12 months for global analytics (all fines, not filtered)
    const last12MonthsFines = await prisma.fines.findMany({
      where: {
        startDate: {
          gte: twelveMonthsAgo.toISOString(),
          lte: now.toISOString()
        }
      }
    });


    // Calculate chart data
    const chartData = {
      statusDistribution: filteredFines.reduce((acc: any, fine) => {
        const status = fine.fineStatus || 'DESCONOCIDO';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),

      monthlyRevenue: (monthlyRevenueData as any[]).reduce((acc: any, row: any) => {
        acc[row.month] = Number(row.totalAmount) || 0;
        return acc;
      }, {}),

      debtByDepartment: filteredFines
        .filter(fine => fine.fineStatus === 'ACTIVA')
        .reduce((acc: any, fine) => {
          const department = fine.department || 'DESCONOCIDO';
          acc[department] = (acc[department] || 0) + (fine.totalAmount || 0);
          return acc;
        }, {}),

      debtByRegion: filteredFines
        .filter(fine => fine.fineStatus === 'ACTIVA')
        .reduce((acc: any, fine) => {
          const region = fine.region || 'DESCONOCIDO';
          if (!acc[region]) {
            acc[region] = { totalAmount: 0, count: 0 };
          }
          acc[region].totalAmount += fine.totalAmount || 0;
          acc[region].count += 1;
          return acc;
        }, {}),

      finesByDepartmentLast12Months: last12MonthsFines.reduce((acc: any, fine) => {
        const department = fine.department || 'NO DEFINIDO';
        if (!acc[department]) {
          acc[department] = { value: 0, count: 0 };
        }
        acc[department].value += fine.totalAmount || 0;
        acc[department].count += 1;
        return acc;
      }, {}),

      // Global chart data (all active fines, no filters)
      globalDebtByDepartment: globalAllFines
        .filter(fine => fine.fineStatus === 'ACTIVA')
        .reduce((acc: any, fine) => {
          const department = fine.department || 'DESCONOCIDO';
          acc[department] = (acc[department] || 0) + (fine.totalAmount || 0);
          return acc;
        }, {}),

      globalDebtByRegion: globalAllFines
        .filter(fine => fine.fineStatus === 'ACTIVA')
        .reduce((acc: any, fine) => {
          const region = fine.region || 'DESCONOCIDO';
          if (!acc[region]) {
            acc[region] = { totalAmount: 0, count: 0 };
          }
          acc[region].totalAmount += fine.totalAmount || 0;
          acc[region].count += 1;
          return acc;
        }, {})
    };

    return {
      kpis,
      chartData,
      total: filteredFines.length
    };
  } catch (error: any) {
    console.error('Error retrieving fines analytics:', error);
    throw error.message;
  }
}

export async function getFines(params: any): Promise<any> {
  try {
    const {
      startDate,
      endDate,
      region,
      status,
      department,
      municipality,
      origin,
      dniRtn,
      operationId,
      companyName,
      paginated = false, // Default is false if not provided
      page = 1,
      limit = 100, // Default limit is 100 if paginated is true
    } = params;

    // Build dynamic filters
    const filters: any = {};
    if (startDate && endDate) {
      filters.startDate = {
        gte: new Date(startDate).toISOString(),
        lte: new Date(endDate).toISOString(),
      };
    }
    if (status) {
      filters.fineStatus = status;
    }
    if(companyName) {
      filters.companyName = {
        contains: companyName
      };
    }
    if(dniRtn) {
      filters.dniRtn = {
        contains: dniRtn
      };
    }
    if (region) {
      filters.region = {
        contains: region
      };
    }
    if (department) {
      filters.department = {
        contains: department
      };
    }
    if (municipality) {
      filters.municipality = {
        contains: municipality
      };
    }
    if (origin) {
      filters.origin = {
        contains: origin
      };
    }
    if (operationId) {
      filters.operationId = operationId;
    }

    // Apply pagination if paginated is true
    const shouldPaginate = paginated === 'true';
    const skip = shouldPaginate ? (page - 1) * limit : undefined;
    const take = shouldPaginate ? parseInt(limit, 10) : undefined;

    // Fetch filtered data from the database
    const data = await prisma.fines.findMany({
      where: filters,
      skip,
      take,
    });

    // Get total count for pagination
    const total = shouldPaginate
      ? await prisma.fines.count({
          where: filters,
        })
      : data.length;

    // Return the response
    return {
      data,
      total,
      page: shouldPaginate ? parseInt(page, 10) : undefined,
      pages: shouldPaginate ? Math.ceil(total / limit) : undefined,
    };
  } catch (error: any) {
    console.error('Error retrieving fines:', error);
    throw error.message;
  }
}
