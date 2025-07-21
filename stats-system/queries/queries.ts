import { PrismaClient } from '../../prisma/client/stats-system';

const prisma = new PrismaClient();

export async function getCertificates(params: any): Promise<any> {
  try {
    // Extract filters and pagination parameters
    const { areaName, department, startDate, endDate, coStatus, noticeStatus, rtn, paginated, modality, dateType, isAutomaticRenewal } = params;

    // Determine pagination values
    let page = 0;
    let limit = 0;
    if (paginated === 'true') {
      page = parseInt(params.page || '1', 10); // Default to page 1 if not provided
      limit = parseInt(params.limit || '100', 10); // Default to 100 items if not provided
    }

    // Build filters dynamically
    const filters: any = {};

    if (isAutomaticRenewal) {
      console.log('isAutomaticRenewal:', isAutomaticRenewal);
      filters.isAutomaticRenewal = parseInt(isAutomaticRenewal, 10);
      console.log('Parsed isAutomaticRenewal:', filters.isAutomaticRenewal);
    }

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
    const { areaName, department, startDate, endDate, coStatus, noticeStatus, rtn, modality, dateType, isAutomaticRenewal } = params;

    // Build base filters
    const filters: any = {};

    if (isAutomaticRenewal) {
      filters.isAutomaticRenewal = parseInt(isAutomaticRenewal, 10);
    }

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
    const { startDate, endDate, region, status, department, municipality, origin, dniRtn, operationId, companyName, employeeId, employeeName } = params;

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
    if (employeeId) filters.employeeId = employeeId;
    if (employeeName) filters.employeeName = { contains: employeeName };

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

export async function getFinesAnalyticsReport(params: any): Promise<any> {
  try {
    // Get base analytics data
    const analyticsData = await getFinesAnalytics(params);

    const { startDate, endDate, region, status, department, municipality, origin, dniRtn, operationId, companyName, employeeId, employeeName } = params;

    // Build filters for detailed analysis
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
    if (employeeId) filters.employeeId = employeeId;
    if (employeeName) filters.employeeName = { contains: employeeName };

    // Get detailed fines for insights
    const filteredFines = await prisma.fines.findMany({
      where: filters,
    });

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Top violators analysis
    const topViolators = await prisma.fines.groupBy({
      by: ['companyName', 'dniRtn'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Violation type analysis
    const violationTypes = await prisma.fines.groupBy({
      by: ['origin'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Collection efficiency analysis
    const collectionAnalysis = {
      totalIssued: filteredFines.length,
      totalCollected: filteredFines.filter(f => f.fineStatus === 'PAGADA').length,
      totalPending: filteredFines.filter(f => f.fineStatus === 'ACTIVA').length,
      totalCancelled: filteredFines.filter(f => f.fineStatus === 'ANULADA').length,
      collectionRate: filteredFines.length > 0 ?
        (filteredFines.filter(f => f.fineStatus === 'PAGADA').length / filteredFines.length) * 100 : 0
    };

    // Time-based trends
    const currentMonthFines = filteredFines.filter(fine =>
      fine.startDate && new Date(fine.startDate) >= currentMonth
    );
    const lastMonthFines = filteredFines.filter(fine =>
      fine.startDate &&
      new Date(fine.startDate) >= lastMonth &&
      new Date(fine.startDate) < currentMonth
    );
    const lastYearFines = await prisma.fines.findMany({
      where: {
        ...filters,
        startDate: {
          gte: new Date(lastYear.getFullYear(), lastYear.getMonth(), 1).toISOString(),
          lte: new Date(lastYear.getFullYear(), lastYear.getMonth() + 1, 0).toISOString()
        }
      }
    });

    const trends = {
      monthOverMonth: {
        current: currentMonthFines.length,
        previous: lastMonthFines.length,
        change: lastMonthFines.length > 0 ?
          ((currentMonthFines.length - lastMonthFines.length) / lastMonthFines.length) * 100 : 0,
        revenue: {
          current: currentMonthFines.reduce((sum, f) => sum + (f.totalAmount || 0), 0),
          previous: lastMonthFines.reduce((sum, f) => sum + (f.totalAmount || 0), 0)
        }
      },
      yearOverYear: {
        current: currentMonthFines.length,
        previous: lastYearFines.length,
        change: lastYearFines.length > 0 ?
          ((currentMonthFines.length - lastYearFines.length) / lastYearFines.length) * 100 : 0
      }
    };

    // Employee performance analysis
    const employeePerformance = await prisma.fines.groupBy({
      by: ['employeeId', 'employeeName'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Outstanding debt aging analysis
    const currentDate = new Date();
    const debtAging = {
      current: filteredFines.filter(f =>
        f.fineStatus === 'ACTIVA' && f.startDate &&
        (currentDate.getTime() - new Date(f.startDate).getTime()) <= (30 * 24 * 60 * 60 * 1000)
      ),
      thirtyDays: filteredFines.filter(f =>
        f.fineStatus === 'ACTIVA' && f.startDate &&
        (currentDate.getTime() - new Date(f.startDate).getTime()) > (30 * 24 * 60 * 60 * 1000) &&
        (currentDate.getTime() - new Date(f.startDate).getTime()) <= (60 * 24 * 60 * 60 * 1000)
      ),
      sixtyDays: filteredFines.filter(f =>
        f.fineStatus === 'ACTIVA' && f.startDate &&
        (currentDate.getTime() - new Date(f.startDate).getTime()) > (60 * 24 * 60 * 60 * 1000) &&
        (currentDate.getTime() - new Date(f.startDate).getTime()) <= (90 * 24 * 60 * 60 * 1000)
      ),
      ninetyDaysPlus: filteredFines.filter(f =>
        f.fineStatus === 'ACTIVA' && f.startDate &&
        (currentDate.getTime() - new Date(f.startDate).getTime()) > (90 * 24 * 60 * 60 * 1000)
      )
    };

    // Generate insights and recommendations
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Collection rate insights
    if (collectionAnalysis.collectionRate < 60) {
      insights.push("Tasa de cobro por debajo del objetivo institucional (60%)");
      recommendations.push("Implementar estrategias de cobro más agresivas para multas pendientes");
    } else if (collectionAnalysis.collectionRate > 80) {
      insights.push("Excelente tasa de cobro, superando estándares institucionales");
    }

    // Trend insights
    if (trends.monthOverMonth.change > 20) {
      insights.push(`Incremento significativo del ${trends.monthOverMonth.change.toFixed(1)}% en multas este mes`);
      recommendations.push("Analizar factores que causaron el incremento en infracciones");
    } else if (trends.monthOverMonth.change < -20) {
      insights.push(`Disminución significativa del ${Math.abs(trends.monthOverMonth.change).toFixed(1)}% en multas este mes`);
    }

    // Debt aging insights
    const oldDebt = debtAging.ninetyDaysPlus.length;
    if (oldDebt > 0) {
      const oldDebtAmount = debtAging.ninetyDaysPlus.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
      insights.push(`${oldDebt} multas con más de 90 días sin cobrar por L. ${oldDebtAmount.toLocaleString()}`);
      recommendations.push("Priorizar cobro de multas con más de 90 días de antigüedad");
    }

    return {
      ...analyticsData,
      reportAnalysis: {
        executiveSummary: {
          totalFines: filteredFines.length,
          totalRevenue: filteredFines.filter(f => f.fineStatus === 'PAGADA').reduce((sum, f) => sum + (f.totalAmount || 0), 0),
          outstandingDebt: filteredFines.filter(f => f.fineStatus === 'ACTIVA').reduce((sum, f) => sum + (f.totalAmount || 0), 0),
          collectionRate: collectionAnalysis.collectionRate,
          periodCovered: { startDate, endDate }
        },
        collectionAnalysis,
        trends,
        topViolators: topViolators.map(tv => ({
          companyName: tv.companyName || 'N/A',
          dniRtn: tv.dniRtn || 'N/A',
          violationCount: tv._count.id,
          totalAmount: tv._sum.totalAmount || 0
        })),
        violationTypes: violationTypes.map(vt => ({
          type: vt.origin || 'No especificado',
          count: vt._count.id,
          totalAmount: vt._sum.totalAmount || 0
        })),
        employeePerformance: employeePerformance.map(ep => ({
          employeeId: ep.employeeId || 'N/A',
          employeeName: ep.employeeName || 'N/A',
          finesIssued: ep._count.id,
          totalAmount: ep._sum.totalAmount || 0
        })),
        debtAging: {
          current: {
            count: debtAging.current.length,
            amount: debtAging.current.reduce((sum, f) => sum + (f.totalAmount || 0), 0)
          },
          thirtyDays: {
            count: debtAging.thirtyDays.length,
            amount: debtAging.thirtyDays.reduce((sum, f) => sum + (f.totalAmount || 0), 0)
          },
          sixtyDays: {
            count: debtAging.sixtyDays.length,
            amount: debtAging.sixtyDays.reduce((sum, f) => sum + (f.totalAmount || 0), 0)
          },
          ninetyDaysPlus: {
            count: debtAging.ninetyDaysPlus.length,
            amount: debtAging.ninetyDaysPlus.reduce((sum, f) => sum + (f.totalAmount || 0), 0)
          }
        },
        insights,
        recommendations,
        sampleFines: filteredFines.slice(0, 50) // Include sample for supporting data
      }
    };
  } catch (error: any) {
    console.error('Error generating fines analytics report:', error);
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
      employeeId,
      employeeName,
      paginated = false, // Default is false if not provided
      page = 1,
      limit = 100, // Default limit is 100 if paginated is true
    } = params;

        console.log('Received params for fines analytics:', params);

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
    if (employeeId) {
      filters.employeeId = employeeId
    }
    if (employeeName) {
      filters.employeeName = {
        contains: employeeName
      };
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

export async function getCertificatesAnalytics(params: any): Promise<any> {
  try {
    const { startDate, endDate, department, documentType, status, dateType } = params;

    // Build filters
    const filters: any = {};
    if (department) filters.department = { contains: department };
    if (documentType) filters.documentType = documentType;
    if (status) filters.documentStatus = status;

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

    const certificates = await prisma.certificates.findMany({
      where: filters,
      distinct: ['noticeCode'],
    });

    // Monthly breakdown
    const monthlyBreakdown = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m', deliveryDate) as month,
        COUNT(DISTINCT noticeCode) as quantity,
        SUM(totalNoticeAmount) as totalAmount
      FROM certificates
      WHERE deliveryDate IS NOT NULL
        AND noticeCode IS NOT NULL
      GROUP BY strftime('%Y-%m', deliveryDate)
      ORDER BY month DESC
      LIMIT 12
    `;

    // Type classification
    const typeClassification = certificates.reduce((acc: any, cert) => {
      const type = cert.documentType || 'Sin Especificar';
      if (!acc[type]) {
        acc[type] = { quantity: 0, percentage: 0, revenue: 0 };
      }
      acc[type].quantity += 1;
      acc[type].revenue += cert.totalNoticeAmount || 0;
      return acc;
    }, {});

    // Calculate percentages
    const totalCerts = certificates.length;
    Object.keys(typeClassification).forEach(type => {
      typeClassification[type].percentage = ((typeClassification[type].quantity / totalCerts) * 100);
    });

    // Department segmentation
    const departmentSegmentation = certificates.reduce((acc: any, cert) => {
      const dept = cert.department || 'Sin Especificar';
      if (!acc[dept]) {
        acc[dept] = { quantity: 0, revenue: 0 };
      }
      acc[dept].quantity += 1;
      acc[dept].revenue += cert.totalNoticeAmount || 0;
      return acc;
    }, {});

    // Calculate variations (mock data for now - could be enhanced with historical comparison)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthCerts = certificates.filter(cert =>
      cert.deliveryDate && new Date(cert.deliveryDate) >= currentMonth
    );
    const lastMonthCerts = certificates.filter(cert =>
      cert.deliveryDate &&
      new Date(cert.deliveryDate) >= lastMonth &&
      new Date(cert.deliveryDate) < currentMonth
    );

    const variation = lastMonthCerts.length > 0
      ? ((currentMonthCerts.length - lastMonthCerts.length) / lastMonthCerts.length) * 100
      : 0;

    // Technical observations (auto-generated based on data patterns)
    const observations: any = [];

    if (variation > 20) {
      observations.push({
        date: now.toISOString(),
        observation: `Incremento significativo del ${variation.toFixed(1)}% en certificados emitidos`,
        category: 'AUTOMATICA',
        priority: 'ALTA'
      });
    } else if (variation < -20) {
      observations.push({
        date: now.toISOString(),
        observation: `Disminución significativa del ${Math.abs(variation).toFixed(1)}% en certificados emitidos`,
        category: 'AUTOMATICA',
        priority: 'ALTA'
      });
    }

    const expiringSoon = certificates.filter(cert => {
      if (!cert.certificateExpirationDate) return false;
      const expDate = new Date(cert.certificateExpirationDate);
      const daysToExpire = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysToExpire > 0 && daysToExpire <= 30;
    });

    if (expiringSoon.length > 10) {
      observations.push({
        date: now.toISOString(),
        observation: `${expiringSoon.length} certificados vencerán en los próximos 30 días`,
        category: 'AUTOMATICA',
        priority: 'MEDIA'
      });
    }

    return {
      monthlyBreakdown: (monthlyBreakdown as any[]).map(row => ({
        month: row.month,
        quantity: Number(row.quantity),
        variation: 0, // Could calculate based on previous month
        totalAmount: Number(row.totalAmount)
      })),
      typeClassification,
      departmentSegmentation,
      totalCertificates: totalCerts,
      totalRevenue: certificates.reduce((sum, cert) => sum + (cert.totalNoticeAmount || 0), 0),
      variation,
      observations,
      summary: {
        mostCommonType: Object.keys(typeClassification).sort((a, b) =>
          typeClassification[b].quantity - typeClassification[a].quantity
        )[0] || 'N/A',
        topDepartment: Object.keys(departmentSegmentation).sort((a, b) =>
          departmentSegmentation[b].revenue - departmentSegmentation[a].revenue
        )[0] || 'N/A'
      }
    };
  } catch (error: any) {
    console.error('Error retrieving certificates analytics:', error);
    throw error.message;
  }
}

export async function getCertificatesAnalyticsReport(params: any): Promise<any> {
  try {
    // Get base analytics data
    const analyticsData = await getCertificatesAnalytics(params);

    const { areaName, department, startDate, endDate, coStatus, noticeStatus, rtn, modality, dateType } = params;

    // Build filters for detailed analysis
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

    // Get detailed certificates for insights
    const filteredCertificates = await prisma.certificates.findMany({
      where: filters,
      distinct: ['noticeCode'],
    });

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Top beneficiaries analysis (companies with most certificates)
    const topBeneficiaries = await prisma.certificates.groupBy({
      by: ['concessionaireName', 'concessionaireRtn'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        totalNoticeAmount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Certificate type/modality analysis
    const modalityAnalysis = await prisma.certificates.groupBy({
      by: ['modality'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        totalNoticeAmount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Document type distribution
    const documentTypeAnalysis = await prisma.certificates.groupBy({
      by: ['documentType'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        totalNoticeAmount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Revenue efficiency analysis
    const revenueAnalysis = {
      totalIssued: filteredCertificates.length,
      totalPaid: filteredCertificates.filter(c => c.noticeStatusDescription === 'PAGADO').length,
      totalActive: filteredCertificates.filter(c => c.noticeStatusDescription === 'ACTIVO').length,
      totalCancelled: filteredCertificates.filter(c => c.noticeStatusDescription === 'ANULADO').length,
      totalRevenue: filteredCertificates.filter(c => c.noticeStatusDescription === 'PAGADO').reduce((sum, c) => sum + (c.totalNoticeAmount || 0), 0),
      paymentRate: filteredCertificates.length > 0 ?
        (filteredCertificates.filter(c => c.noticeStatusDescription === 'PAGADO').length / filteredCertificates.length) * 100 : 0
    };

    // Time-based trends
    const currentMonthCerts = filteredCertificates.filter(cert =>
      cert.deliveryDate && new Date(cert.deliveryDate) >= currentMonth
    );
    const lastMonthCerts = filteredCertificates.filter(cert =>
      cert.deliveryDate &&
      new Date(cert.deliveryDate) >= lastMonth &&
      new Date(cert.deliveryDate) < currentMonth
    );
    const lastYearCerts = await prisma.certificates.findMany({
      where: {
        ...filters,
        deliveryDate: {
          gte: new Date(lastYear.getFullYear(), lastYear.getMonth(), 1).toISOString(),
          lte: new Date(lastYear.getFullYear(), lastYear.getMonth() + 1, 0).toISOString()
        }
      },
      distinct: ['noticeCode']
    });

    const trends = {
      monthOverMonth: {
        current: currentMonthCerts.length,
        previous: lastMonthCerts.length,
        change: lastMonthCerts.length > 0 ?
          ((currentMonthCerts.length - lastMonthCerts.length) / lastMonthCerts.length) * 100 : 0,
        revenue: {
          current: currentMonthCerts.reduce((sum, c) => sum + (c.totalNoticeAmount || 0), 0),
          previous: lastMonthCerts.reduce((sum, c) => sum + (c.totalNoticeAmount || 0), 0)
        }
      },
      yearOverYear: {
        current: currentMonthCerts.length,
        previous: lastYearCerts.length,
        change: lastYearCerts.length > 0 ?
          ((currentMonthCerts.length - lastYearCerts.length) / lastYearCerts.length) * 100 : 0
      }
    };

    // Expiration analysis (certificates expiring soon)
    const expirationAnalysis = {
      expiringSoon: filteredCertificates.filter(c => {
        if (!c.certificateExpirationDate) return false;
        const expDate = new Date(c.certificateExpirationDate);
        const daysToExpire = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysToExpire > 0 && daysToExpire <= 30;
      }),
      expiredRecently: filteredCertificates.filter(c => {
        if (!c.certificateExpirationDate) return false;
        const expDate = new Date(c.certificateExpirationDate);
        const daysSinceExpired = (now.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceExpired > 0 && daysSinceExpired <= 90;
      }),
      validCertificates: filteredCertificates.filter(c => {
        if (!c.certificateExpirationDate) return false;
        const expDate = new Date(c.certificateExpirationDate);
        return expDate.getTime() > now.getTime();
      })
    };

    // Area/department performance analysis
    const departmentPerformance = await prisma.certificates.groupBy({
      by: ['department', 'areaName'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        totalNoticeAmount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Generate insights and recommendations
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Payment rate insights
    if (revenueAnalysis.paymentRate < 70) {
      insights.push("Tasa de pago por debajo del objetivo institucional (70%)");
      recommendations.push("Implementar recordatorios automáticos para pagos pendientes");
    } else if (revenueAnalysis.paymentRate > 90) {
      insights.push("Excelente tasa de pago, superando estándares institucionales");
    }

    // Trend insights
    if (trends.monthOverMonth.change > 15) {
      insights.push(`Incremento significativo del ${trends.monthOverMonth.change.toFixed(1)}% en certificados este mes`);
      recommendations.push("Evaluar capacidad operativa para mantener calidad de servicio");
    } else if (trends.monthOverMonth.change < -15) {
      insights.push(`Disminución significativa del ${Math.abs(trends.monthOverMonth.change).toFixed(1)}% en certificados este mes`);
      recommendations.push("Analizar factores que pueden estar afectando la demanda");
    }

    // Expiration insights
    const expiringSoon = expirationAnalysis.expiringSoon.length;
    if (expiringSoon > 50) {
      insights.push(`${expiringSoon} certificados vencerán en los próximos 30 días`);
      recommendations.push("Implementar sistema de notificaciones preventivas para renovaciones");
    }

    const expiredRecently = expirationAnalysis.expiredRecently.length;
    if (expiredRecently > 20) {
      insights.push(`${expiredRecently} certificados vencieron en los últimos 90 días`);
      recommendations.push("Contactar empresas con certificados vencidos para facilitar renovación");
    }

    // Top modality insights
    const topModality = modalityAnalysis[0];
    if (topModality && topModality._count.id > filteredCertificates.length * 0.4) {
      insights.push(`${topModality.modality} representa el ${((topModality._count.id / filteredCertificates.length) * 100).toFixed(1)}% de todos los certificados`);
    }

    return {
      ...analyticsData,
      reportAnalysis: {
        executiveSummary: {
          totalCertificates: filteredCertificates.length,
          totalRevenue: revenueAnalysis.totalRevenue,
          paymentRate: revenueAnalysis.paymentRate,
          validCertificates: expirationAnalysis.validCertificates.length,
          expiringSoon: expirationAnalysis.expiringSoon.length,
          periodCovered: { startDate, endDate }
        },
        revenueAnalysis,
        trends,
        topBeneficiaries: topBeneficiaries.map(tb => ({
          companyName: tb.concessionaireName || 'N/A',
          rtn: tb.concessionaireRtn || 'N/A',
          certificateCount: tb._count.id,
          totalAmount: tb._sum.totalNoticeAmount || 0
        })),
        modalityAnalysis: modalityAnalysis.map(ma => ({
          modality: ma.modality || 'No especificado',
          count: ma._count.id,
          totalAmount: ma._sum.totalNoticeAmount || 0,
          percentage: (ma._count.id / filteredCertificates.length) * 100
        })),
        documentTypeAnalysis: documentTypeAnalysis.map(dta => ({
          documentType: dta.documentType || 'No especificado',
          count: dta._count.id,
          totalAmount: dta._sum.totalNoticeAmount || 0,
          percentage: (dta._count.id / filteredCertificates.length) * 100
        })),
        expirationAnalysis: {
          expiringSoon: {
            count: expirationAnalysis.expiringSoon.length,
            certificates: expirationAnalysis.expiringSoon.slice(0, 10).map(c => ({
              certificateNumber: c.certificateNumber,
              companyName: c.concessionaireName,
              expirationDate: c.certificateExpirationDate,
              daysToExpire: c.certificateExpirationDate ?
                Math.ceil((new Date(c.certificateExpirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
            }))
          },
          expiredRecently: {
            count: expirationAnalysis.expiredRecently.length,
            amount: expirationAnalysis.expiredRecently.reduce((sum, c) => sum + (c.totalNoticeAmount || 0), 0)
          },
          validCertificates: {
            count: expirationAnalysis.validCertificates.length,
            amount: expirationAnalysis.validCertificates.reduce((sum, c) => sum + (c.totalNoticeAmount || 0), 0)
          }
        },
        departmentPerformance: departmentPerformance.map(dp => ({
          department: dp.department || 'N/A',
          areaName: dp.areaName || 'N/A',
          certificatesIssued: dp._count.id,
          totalAmount: dp._sum.totalNoticeAmount || 0
        })),
        insights,
        recommendations,
        sampleCertificates: filteredCertificates.slice(0, 50) // Include sample for supporting data
      }
    };
  } catch (error: any) {
    console.error('Error generating certificates analytics report:', error);
    throw error.message;
  }
}

export async function getPermitsAnalytics(params: any): Promise<any> {
  try {
    const { startDate, endDate, region } = params;

    // For permits, we'll analyze based on certificates with modality (transport type)
    const filters: any = {};
    if (region) filters.department = { contains: region };

    if (startDate && endDate) {
      filters['deliveryDate'] = {
        gte: new Date(startDate as string).toISOString(),
        lte: new Date(endDate as string).toISOString(),
      };
    }

    const permits = await prisma.certificates.findMany({
      where: filters,
      distinct: ['noticeCode'],
    });

    // Transport type classification
    const transportTypes = permits.reduce((acc: any, permit) => {
      const type = permit.modality || 'Sin Especificar';
      if (!acc[type]) {
        acc[type] = { permits: 0, monthlyVariation: 0 };
      }
      acc[type].permits += 1;
      return acc;
    }, {});

    // Regional segmentation
    const regions = permits.reduce((acc: any, permit) => {
      const region = permit.department || 'Sin Especificar';
      if (!acc[region]) {
        acc[region] = { permits: 0, monthlyVariation: 0 };
      }
      acc[region].permits += 1;
      return acc;
    }, {});

    // Calculate monthly variation (simplified)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthPermits = permits.filter(permit =>
      permit.deliveryDate && new Date(permit.deliveryDate) >= currentMonth
    );
    const lastMonthPermits = permits.filter(permit =>
      permit.deliveryDate &&
      new Date(permit.deliveryDate) >= lastMonth &&
      new Date(permit.deliveryDate) < currentMonth
    );

    const totalVariation = lastMonthPermits.length > 0
      ? ((currentMonthPermits.length - lastMonthPermits.length) / lastMonthPermits.length) * 100
      : 0;

    return {
      transportTypes: Object.keys(transportTypes).map(type => ({
        name: type,
        permits: transportTypes[type].permits,
        monthlyVariation: Math.random() * 20 - 10 // Mock variation
      })),
      regions: Object.keys(regions).map(region => ({
        name: region,
        permits: regions[region].permits,
        monthlyVariation: Math.random() * 15 - 7.5 // Mock variation
      })),
      totalCurrentMonth: currentMonthPermits.length,
      totalLastMonth: lastMonthPermits.length,
      totalVariation
    };
  } catch (error: any) {
    console.error('Error retrieving permits analytics:', error);
    throw error.message;
  }
}

export async function getRevenueAnalytics(params: any): Promise<any> {
  try {
    const { startDate, endDate } = params;

    const filters: any = {};
    if (startDate && endDate) {
      filters['paymentDate'] = {
        gte: new Date(startDate as string).toISOString(),
        lte: new Date(endDate as string).toISOString(),
      };
    }

    // Get revenue from certificates
    const certificates = await prisma.certificates.findMany({
      where: {
        ...filters,
        noticeStatusDescription: 'PAGADO'
      },
      distinct: ['noticeCode'],
    });

    // Get revenue from fines
    const fines = await prisma.fines.findMany({
      where: {
        fineStatus: 'PAGADA',
        ...(startDate && endDate ? {
          startDate: {
            gte: new Date(startDate as string).toISOString(),
            lte: new Date(endDate as string).toISOString(),
          }
        } : {})
      }
    });

    // Revenue sources
    const certificatesRevenue = certificates.reduce((sum, cert) => sum + (cert.totalNoticeAmount || 0), 0);
    const finesRevenue = fines.reduce((sum, fine) => sum + (fine.totalAmount || 0), 0);
    const permitsRevenue = certificatesRevenue * 0.3; // Mock - 30% of certificates
    const otherRevenue = (certificatesRevenue + finesRevenue) * 0.1; // Mock - 10% other

    const totalRealRevenue = certificatesRevenue + finesRevenue + permitsRevenue + otherRevenue;

    // Mock budget data (in real implementation, this would come from a budget table)
    const budgetData = {
      certificates: certificatesRevenue * 1.2,
      permits: permitsRevenue * 1.1,
      fines: finesRevenue * 0.9,
      other: otherRevenue * 1.3
    };

    const totalBudget = Object.values(budgetData).reduce((sum, val) => sum + val, 0);

    const sources = [
      {
        name: 'Certificados',
        realRevenue: certificatesRevenue,
        projectedRevenue: budgetData.certificates,
        completionPercentage: (certificatesRevenue / budgetData.certificates) * 100
      },
      {
        name: 'Permisos de Operación',
        realRevenue: permitsRevenue,
        projectedRevenue: budgetData.permits,
        completionPercentage: (permitsRevenue / budgetData.permits) * 100
      },
      {
        name: 'Multas y Sanciones',
        realRevenue: finesRevenue,
        projectedRevenue: budgetData.fines,
        completionPercentage: (finesRevenue / budgetData.fines) * 100
      },
      {
        name: 'Otros Ingresos',
        realRevenue: otherRevenue,
        projectedRevenue: budgetData.other,
        completionPercentage: (otherRevenue / budgetData.other) * 100
      }
    ];

    // KPIs by source
    const kpisBySource = sources.map(source => ({
      source: source.name,
      objective: source.projectedRevenue,
      real: source.realRevenue,
      completionPercentage: source.completionPercentage,
      status: source.completionPercentage >= 100 ? 'CUMPLIDO' :
              source.completionPercentage >= 80 ? 'ADVERTENCIA' : 'CRÍTICO'
    }));

    return {
      sources,
      totalBudget,
      totalRealRevenue,
      totalCompletionPercentage: (totalRealRevenue / totalBudget) * 100,
      kpisBySource
    };
  } catch (error: any) {
    console.error('Error retrieving revenue analytics:', error);
    throw error.message;
  }
}

export async function getEventualPermits(params: any): Promise<any> {
  try {
    // Extract filters and pagination parameters
    const { permitStatus, serviceType, rtn, applicantName, startDate, endDate, paginated, dateType } = params;

    // Determine pagination values
    let page = 0;
    let limit = 0;
    if (paginated === 'true') {
      page = parseInt(params.page || '1', 10);
      limit = parseInt(params.limit || '100', 10);
    }

    // Build filters dynamically
    const filters: any = {};

    if (permitStatus) {
      filters.permitStatus = permitStatus;
    }

    if (serviceType) {
      filters.serviceTypeDescription = { contains: serviceType };
    }

    if (rtn) {
      filters.rtn = { contains: rtn };
    }

    if (applicantName) {
      filters.applicantName = { contains: applicantName };
    }

    if (startDate && endDate && dateType) {
      if (dateType === 'system') {
        filters['systemDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      }
    }

    // Filter out records with noticeCode '0' or null amounts to prevent API crashes
    filters.AND = [
      {
        OR: [
          { noticeCode: { not: '0' } },
          { noticeCode: null }
        ]
      },
      {
        OR: [
          { amount: { not: null } },
          { noticeCode: null },
          { noticeCode: '0' }
        ]
      }
    ];

    // Use distinct to get unique records by noticeCode at database level
    const data = await prisma.eventual_permits.findMany({
      where: filters,
      distinct: ['noticeCode'],
      skip: paginated === 'true' ? (page - 1) * limit : undefined,
      take: paginated === 'true' ? limit : undefined,
    });

    // Count total unique records for pagination
    const totalUniqueRecords = await prisma.eventual_permits.findMany({
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
    console.error('Error retrieving eventual permits:', error);
    throw error.message;
  }
}

export async function getEventualPermitsAnalytics(params: any): Promise<any> {
  try {
    const { permitStatus, serviceType, rtn, applicantName, startDate, endDate, dateType } = params;

    // Build base filters
    const filters: any = {};

    if (permitStatus) filters.permitStatus = permitStatus;
    if (serviceType) filters.serviceTypeDescription = { contains: serviceType };
    if (rtn) filters.rtn = { contains: rtn };
    if (applicantName) filters.applicantName = { contains: applicantName };

    if (startDate && endDate && dateType) {
      if (dateType === 'system') {
        filters['systemDate'] = {
          gte: new Date(startDate as string).toISOString(),
          lte: new Date(endDate as string).toISOString(),
        };
      }
    }

    // Filter out records with noticeCode '0' or null amounts to prevent API crashes
    filters.AND = [
      {
        OR: [
          { noticeCode: { not: '0' } },
          { noticeCode: null }
        ]
      },
      {
        OR: [
          { amount: { not: null } },
          { noticeCode: null },
          { noticeCode: '0' }
        ]
      }
    ];

    // Get filtered permits using distinct noticeCode
    const permits = await prisma.eventual_permits.findMany({
      where: filters,
      distinct: ['noticeCode'],
    });

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    // Deduplicate using noticeCode
    const uniqueNoticeCodes = new Map();
    permits.forEach(permit => {
      if (permit.noticeCode && !uniqueNoticeCodes.has(permit.noticeCode)) {
        uniqueNoticeCodes.set(permit.noticeCode, permit);
      }
    });

    const uniquePermits = Array.from(uniqueNoticeCodes.values());

    // Calculate KPIs
    const kpis = {
      totalPermits: uniquePermits.length,
      totalRevenue: uniquePermits.reduce((sum, permit) => sum + (permit.amount || 0), 0),
      activePermits: uniquePermits.filter(permit => permit.permitStatus === 'ACTIVO').length,
      processedPermits: uniquePermits.filter(permit => permit.permitStatus === 'PROCESADO').length,
      cancelledPermits: uniquePermits.filter(permit => permit.permitStatus === 'ANULADO').length,
    };

    // Monthly revenue data using SQL for better performance
    const monthlyRevenueData = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m', systemDate) as month,
        SUM(amount) as totalAmount
      FROM (
        SELECT DISTINCT noticeCode, amount, systemDate
        FROM eventual_permits
        WHERE systemDate IS NOT NULL
          AND noticeCode IS NOT NULL
          AND noticeCode != '0'
          AND amount IS NOT NULL
      )
      GROUP BY strftime('%Y-%m', systemDate)
      ORDER BY month DESC
      LIMIT 24
    `;

    // Calculate chart data using unique permits
    const chartData = {
      statusDistribution: uniquePermits.reduce((acc: any, permit) => {
        const status = permit.permitStatus || "NO DEFINIDO";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),

      revenueByStatus: uniquePermits.reduce((acc: any, permit) => {
        const status = permit.permitStatus || "NO DEFINIDO";
        acc[status] = (acc[status] || 0) + (permit.amount || 0);
        return acc;
      }, {}),

      serviceTypeDistribution: uniquePermits.reduce((acc: any, permit) => {
        const serviceType = permit.serviceTypeDescription || "NO DEFINIDO";
        acc[serviceType] = (acc[serviceType] || 0) + 1;
        return acc;
      }, {}),

      monthlyRevenue: (monthlyRevenueData as any[]).reduce((acc: any, row: any) => {
        acc[row.month] = Number(row.totalAmount) || 0;
        return acc;
      }, {}),

      regionalOfficeDistribution: uniquePermits.reduce((acc: any, permit) => {
        const office = permit.regionalOffice || "NO DEFINIDO";
        acc[office] = (acc[office] || 0) + 1;
        return acc;
      }, {}),
    };

    return {
      kpis,
      chartData,
      total: uniquePermits.length
    };
  } catch (error: any) {
    console.error('Error retrieving eventual permits analytics:', error);
    throw error.message;
  }
}
