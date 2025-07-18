import { PrismaClient } from '../../prisma/client/stats-system';

const prisma = new PrismaClient();

export async function getApplications(params: any): Promise<any> {
  try {
    const {
      applicationId,
      applicantName,
      companyName,
      startDate,
      endDate,
      fileStatus,
      procedureType,
      categoryId,
      plateId,
      isAutomaticRenewal,
      cityCode,
      paginated = false,
      page = 1,
      limit = 100
    } = params;

    // Build dynamic filters
    const filters: any = {};

    if (applicationId) {
      filters.applicationId = { contains: applicationId };
    }

    if (applicantName) {
      filters.applicantName = { contains: applicantName };
    }

    if (companyName) {
      filters.companyName = { contains: companyName };
    }

    if (fileStatus) {
      filters.fileStatus = fileStatus;
    }

    if (procedureType) {
      filters.procedureTypeDescription = { contains: procedureType };
    }

    if (categoryId) {
      filters.categoryId = categoryId;
    }

    if (plateId) {
      filters.plateId = { contains: plateId };
    }

    if (isAutomaticRenewal !== undefined) {
      filters.isAutomaticRenewal = isAutomaticRenewal ? 1 : 0;
    }

    if (cityCode) {
      filters.cityCode = cityCode;
    }

    // Date filtering using receivedDate only
    if (startDate && endDate) {
      filters['receivedDate'] = {
        gte: new Date(startDate).toISOString(),
        lte: new Date(endDate).toISOString(),
      };
    }

    // Apply pagination if requested
    const shouldPaginate = paginated === 'true';
    const skip = shouldPaginate ? (page - 1) * limit : undefined;
    const take = shouldPaginate ? parseInt(limit, 10) : undefined;

    // Fetch applications from SQLite table
    const data = await prisma.applications.findMany({
      where: filters,
      skip,
      take,
      orderBy: {
        receivedDate: 'desc'
      }
    });

    // Get total count for pagination
    const totalUniqueRecords = await prisma.applications.findMany({
      where: filters,
      select: { id: true }
    });
    const total = shouldPaginate ? totalUniqueRecords.length : data.length;

    return {
      data,
      total,
      page: shouldPaginate ? parseInt(page, 10) : undefined,
      pages: shouldPaginate ? Math.ceil(total / limit) : undefined,
    };
  } catch (error: any) {
    console.error('Error retrieving applications:', error);
    throw error.message;
  }
}

export async function getApplicationsAnalytics(params: any): Promise<any> {
  try {
    const {
      applicationId,
      applicantName,
      companyName,
      startDate,
      endDate,
      fileStatus,
      procedureType,
      categoryId,
      plateId,
      isAutomaticRenewal,
      cityCode
    } = params;

    // Build base filters
    const filters: any = {};

    if (applicationId) filters.applicationId = { contains: applicationId };
    if (applicantName) filters.applicantName = { contains: applicantName };
    if (companyName) filters.companyName = { contains: companyName };
    if (fileStatus) filters.fileStatus = fileStatus;
    if (procedureType) filters.procedureTypeDescription = { contains: procedureType };
    if (categoryId) filters.categoryId = categoryId;
    if (plateId) filters.plateId = { contains: plateId };
    if (isAutomaticRenewal !== undefined) filters.isAutomaticRenewal = isAutomaticRenewal ? 1 : 0;
    if (cityCode) filters.cityCode = cityCode;

    // Date filtering using receivedDate only
    if (startDate && endDate) {
      filters['receivedDate'] = {
        gte: new Date(startDate).toISOString(),
        lte: new Date(endDate).toISOString(),
      };
    }

    // Get filtered applications from SQLite table
    const applications = await prisma.applications.findMany({
      where: filters,
    });

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    // Calculate KPIs
    const kpis = {
      totalApplications: applications.length,
      pendingApplications: applications.filter(app => app.fileStatus === 'PENDIENTE').length,
      approvedApplications: applications.filter(app => app.fileStatus === 'APROBADO').length,
      rejectedApplications: applications.filter(app => app.fileStatus === 'RECHAZADO').length,
      inProcessApplications: applications.filter(app => app.fileStatus === 'EN PROCESO').length,
      automaticRenewals: applications.filter(app => app.isAutomaticRenewal === 1).length,
      manualApplications: applications.filter(app => app.isAutomaticRenewal === 0).length,
    };

    // Monthly applications data using SQLite query
    const monthlyApplicationsData = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m', receivedDate) as month,
        COUNT(*) as totalApplications
      FROM applications
      WHERE receivedDate IS NOT NULL
        AND applicationId IS NOT NULL
      GROUP BY strftime('%Y-%m', receivedDate)
      ORDER BY month DESC
    `;

    // Calculate chart data
    const chartData = {
      statusDistribution: applications.reduce((acc: any, app) => {
        const status = app.fileStatus || "NO DEFINIDO";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),

      procedureTypeDistribution: applications.reduce((acc: any, app) => {
        const procedureType = app.procedureTypeDescription || "NO DEFINIDO";
        acc[procedureType] = (acc[procedureType] || 0) + 1;
        return acc;
      }, {}),

      categoryDistribution: applications.reduce((acc: any, app) => {
        const category = app.categoryDescription || "NO DEFINIDO";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),

      monthlyApplications: (monthlyApplicationsData as any[]).reduce((acc: any, row: any) => {
        acc[row.month] = Number(row.totalApplications) || 0;
        return acc;
      }, {}),

      renewalTypeDistribution: {
        'AUTOMATICA': applications.filter(app => app.isAutomaticRenewal === 1).length,
        'MANUAL': applications.filter(app => app.isAutomaticRenewal === 0).length,
      },

      cityDistribution: applications.reduce((acc: any, app) => {
        const city = app.cityCode || "NO DEFINIDO";
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {}),

      serviceClassDistribution: applications.reduce((acc: any, app) => {
        const serviceClass = app.serviceClassDescription || "NO DEFINIDO";
        acc[serviceClass] = (acc[serviceClass] || 0) + 1;
        return acc;
      }, {}),
    };

    return {
      kpis,
      chartData,
      total: applications.length
    };
  } catch (error: any) {
    console.error('Error retrieving applications analytics:', error);
    throw error.message;
  }
}

export async function getApplicationsAnalyticsReport(params: any): Promise<any> {
  try {
    // Get base analytics data
    const analyticsData = await getApplicationsAnalytics(params);

    const {
      applicationId,
      applicantName,
      companyName,
      startDate,
      endDate,
      fileStatus,
      procedureType,
      categoryId,
      plateId,
      isAutomaticRenewal,
      cityCode
    } = params;

    // Build filters for detailed analysis
    const filters: any = {};
    if (applicationId) filters.applicationId = { contains: applicationId };
    if (applicantName) filters.applicantName = { contains: applicantName };
    if (companyName) filters.companyName = { contains: companyName };
    if (fileStatus) filters.fileStatus = fileStatus;
    if (procedureType) filters.procedureTypeDescription = { contains: procedureType };
    if (categoryId) filters.categoryId = categoryId;
    if (plateId) filters.plateId = { contains: plateId };
    if (isAutomaticRenewal !== undefined) filters.isAutomaticRenewal = isAutomaticRenewal ? 1 : 0;
    if (cityCode) filters.cityCode = cityCode;

    if (startDate && endDate) {
      filters['receivedDate'] = {
        gte: new Date(startDate).toISOString(),
        lte: new Date(endDate).toISOString(),
      };
    }

    // Get detailed applications for insights
    const filteredApplications = await prisma.applications.findMany({
      where: filters
    });

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Top applicants analysis
    const topApplicants = await prisma.applications.groupBy({
      by: ['applicantName', 'companyName'],
      where: filters,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Procedure type analysis
    const procedureTypeAnalysis = await prisma.applications.groupBy({
      by: ['procedureTypeDescription'],
      where: filters,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Processing efficiency analysis
    const processingAnalysis = {
      totalApplications: filteredApplications.length,
      pendingApplications: filteredApplications.filter(app => app.fileStatus === 'PENDIENTE').length,
      approvedApplications: filteredApplications.filter(app => app.fileStatus === 'APROBADO').length,
      rejectedApplications: filteredApplications.filter(app => app.fileStatus === 'RECHAZADO').length,
      inProcessApplications: filteredApplications.filter(app => app.fileStatus === 'EN PROCESO').length,
      approvalRate: filteredApplications.length > 0 ?
        (filteredApplications.filter(app => app.fileStatus === 'APROBADO').length / filteredApplications.length) * 100 : 0,
      rejectionRate: filteredApplications.length > 0 ?
        (filteredApplications.filter(app => app.fileStatus === 'RECHAZADO').length / filteredApplications.length) * 100 : 0
    };

    // Time-based trends
    const currentMonthApplications = filteredApplications.filter(app =>
      app.receivedDate && new Date(app.receivedDate) >= currentMonth
    );
    const lastMonthApplications = filteredApplications.filter(app =>
      app.receivedDate &&
      new Date(app.receivedDate) >= lastMonth &&
      new Date(app.receivedDate) < currentMonth
    );
    const lastYearApplications = await prisma.applications.findMany({
      where: {
        ...filters,
        receivedDate: {
          gte: new Date(lastYear.getFullYear(), lastYear.getMonth(), 1).toISOString(),
          lte: new Date(lastYear.getFullYear(), lastYear.getMonth() + 1, 0).toISOString()
        }
      }
    });

    const trends = {
      monthOverMonth: {
        current: currentMonthApplications.length,
        previous: lastMonthApplications.length,
        change: lastMonthApplications.length > 0 ?
          ((currentMonthApplications.length - lastMonthApplications.length) / lastMonthApplications.length) * 100 : 0
      },
      yearOverYear: {
        current: currentMonthApplications.length,
        previous: lastYearApplications.length,
        change: lastYearApplications.length > 0 ?
          ((currentMonthApplications.length - lastYearApplications.length) / lastYearApplications.length) * 100 : 0
      }
    };

    // Renewal type analysis
    const renewalAnalysis = {
      automaticRenewals: filteredApplications.filter(app => app.isAutomaticRenewal === 1).length,
      manualApplications: filteredApplications.filter(app => app.isAutomaticRenewal === 0).length,
      automaticRenewalRate: filteredApplications.length > 0 ?
        (filteredApplications.filter(app => app.isAutomaticRenewal === 1).length / filteredApplications.length) * 100 : 0
    };

    // City/regional distribution analysis
    const cityPerformance = await prisma.applications.groupBy({
      by: ['cityCode'],
      where: filters,
      _count: {
        id: true
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

    // Approval rate insights
    if (processingAnalysis.approvalRate < 70) {
      insights.push("Tasa de aprobación por debajo del objetivo institucional (70%)");
      recommendations.push("Revisar criterios de aprobación y proporcionar mejor orientación a solicitantes");
    } else if (processingAnalysis.approvalRate > 90) {
      insights.push("Excelente tasa de aprobación, superando estándares institucionales");
    }

    // Trend insights
    if (trends.monthOverMonth.change > 20) {
      insights.push(`Incremento significativo del ${trends.monthOverMonth.change.toFixed(1)}% en solicitudes este mes`);
      recommendations.push("Evaluar capacidad operativa para procesar el incremento en solicitudes");
    } else if (trends.monthOverMonth.change < -20) {
      insights.push(`Disminución significativa del ${Math.abs(trends.monthOverMonth.change).toFixed(1)}% en solicitudes este mes`);
      recommendations.push("Analizar factores que pueden estar afectando el volumen de solicitudes");
    }

    // Pending applications insights
    const pendingApplications = processingAnalysis.pendingApplications;
    if (pendingApplications > 100) {
      insights.push(`${pendingApplications} solicitudes pendientes de procesamiento`);
      recommendations.push("Priorizar el procesamiento de solicitudes pendientes para mejorar tiempo de respuesta");
    }

    // Renewal type insights
    if (renewalAnalysis.automaticRenewalRate < 30) {
      insights.push(`Solo ${renewalAnalysis.automaticRenewalRate.toFixed(1)}% de renovaciones son automáticas`);
      recommendations.push("Promover el uso de renovaciones automáticas para mejorar eficiencia");
    }

    return {
      ...analyticsData,
      reportAnalysis: {
        executiveSummary: {
          totalApplications: filteredApplications.length,
          approvalRate: processingAnalysis.approvalRate,
          rejectionRate: processingAnalysis.rejectionRate,
          pendingApplications: processingAnalysis.pendingApplications,
          automaticRenewalRate: renewalAnalysis.automaticRenewalRate,
          periodCovered: { startDate, endDate }
        },
        processingAnalysis,
        trends,
        renewalAnalysis,
        topApplicants: topApplicants.map(ta => ({
          applicantName: ta.applicantName || 'N/A',
          companyName: ta.companyName || 'N/A',
          applicationCount: ta._count.id
        })),
        procedureTypeAnalysis: procedureTypeAnalysis.map(pta => ({
          procedureType: pta.procedureTypeDescription || 'No especificado',
          count: pta._count.id,
          percentage: (pta._count.id / filteredApplications.length) * 100
        })),
        cityPerformance: cityPerformance.map(cp => ({
          cityCode: cp.cityCode || 'N/A',
          applicationsCount: cp._count.id,
          percentage: (cp._count.id / filteredApplications.length) * 100
        })),
        insights,
        recommendations,
        sampleApplications: filteredApplications.slice(0, 50) // Include sample for supporting data
      }
    };
  } catch (error: any) {
    console.error('Error generating applications analytics report:', error);
    throw error.message;
  }
}

export async function getApplicationsDashboard(params: any): Promise<any> {
  try {
    // Get all applications for dashboard KPIs (no filtering)
    const allApplications = await prisma.applications.findMany();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // Recent applications (last 30 days)
    const recentApplications = allApplications.filter(app =>
      app.receivedDate && new Date(app.receivedDate) >= thirtyDaysAgo
    );

    // Applications requiring attention (pending > 30 days)
    const stalledApplications = allApplications.filter(app =>
      app.fileStatus === 'PENDIENTE' &&
      app.receivedDate && new Date(app.receivedDate) < thirtyDaysAgo
    );

    // Dashboard KPIs
    const dashboardKpis = {
      totalApplications: allApplications.length,
      recentApplications: recentApplications.length,
      pendingApplications: allApplications.filter(app => app.fileStatus === 'PENDIENTE').length,
      approvedApplications: allApplications.filter(app => app.fileStatus === 'APROBADO').length,
      rejectedApplications: allApplications.filter(app => app.fileStatus === 'RECHAZADO').length,
      stalledApplications: stalledApplications.length,
      automaticRenewals: allApplications.filter(app => app.isAutomaticRenewal === 1).length,
      averageProcessingTime: 0 // Could be calculated based on receivedDate vs systemDate
    };

    // Quick stats for dashboard charts
    const quickStats = {
      statusBreakdown: allApplications.reduce((acc: any, app) => {
        const status = app.fileStatus || "NO DEFINIDO";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),

      recentTrend: recentApplications.reduce((acc: any, app) => {
        const date = app.receivedDate ? new Date(app.receivedDate).toISOString().split('T')[0] : 'Sin fecha';
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}),

      topProcedureTypes: allApplications.reduce((acc: any, app) => {
        const procedureType = app.procedureTypeDescription || "NO DEFINIDO";
        acc[procedureType] = (acc[procedureType] || 0) + 1;
        return acc;
      }, {}),
    };

    return {
      dashboardKpis,
      quickStats,
      recentApplications: recentApplications.slice(0, 10), // Latest 10 applications
      stalledApplications: stalledApplications.slice(0, 10), // 10 applications needing attention
      total: allApplications.length
    };
  } catch (error: any) {
    console.error('Error retrieving applications dashboard:', error);
    throw error.message;
  }
}
