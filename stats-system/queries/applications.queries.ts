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
      procedureTypeDescription,
      procedureClassDescription,
      categoryDescription,
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

    if (procedureTypeDescription) {
      filters.procedureTypeDescription = { contains: procedureTypeDescription };
    }
    
    if (procedureClassDescription) {
      filters.procedureClassDescription = { contains: procedureClassDescription };
    }

    if (categoryDescription) {
      filters.categoryDescription = { contains: categoryDescription };
    }

    if (plateId) {
      filters.plateId = { contains: plateId };
    }

    if (isAutomaticRenewal !== undefined) {
      filters.isAutomaticRenewal = (String(isAutomaticRenewal) === 'true' || isAutomaticRenewal === true) ? '1' : '0';
    }

    if (cityCode) {
      filters.cityCode = cityCode;
    }

    // Date filtering using receivedDate only
    if (startDate && endDate) {
      filters['receivedDate'] = {
        gte: startDate,
        lte: endDate,
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

    // Get total count for pagination - this is for applications list (all records)
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
      procedureTypeDescription,
      procedureClassDescription,
      categoryDescription,
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
    if (procedureTypeDescription) filters.procedureTypeDescription = { contains: procedureTypeDescription };
    if (procedureClassDescription) filters.procedureClassDescription = { contains: procedureClassDescription };
    if (categoryDescription) filters.categoryDescription = { contains: categoryDescription };
    if (plateId) filters.plateId = { contains: plateId };
    if (isAutomaticRenewal !== undefined) filters.isAutomaticRenewal = (String(isAutomaticRenewal) === 'true' || isAutomaticRenewal === true) ? '1' : '0';
    if (cityCode) filters.cityCode = cityCode;

    // Date filtering using receivedDate only
    if (startDate && endDate) {
      filters['receivedDate'] = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get ALL filtered applications from SQLite table (for procedures count)
    const allApplicationRecords = await prisma.applications.findMany({
      where: filters,
    });

    // Get UNIQUE applications from SQLite table (for applications count and money calculations)
    const uniqueApplications = await prisma.applications.findMany({
      where: filters,
      distinct: ['applicationCode'],
    });

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    // Calculate KPIs - Use UNIQUE applications for application counts (avoid double counting)
    const kpis = {
      totalApplications: uniqueApplications.length,
      activeApplications: uniqueApplications.filter(app => app.fileStatus === 'ACTIVO').length,
      finalizedApplications: uniqueApplications.filter(app => app.fileStatus === 'FINALIZADO').length,
      inactiveApplications: uniqueApplications.filter(app => app.fileStatus === 'INACTIVO').length,
      errorApplications: uniqueApplications.filter(app => app.fileStatus === 'RETROTRAIDO POR ERROR DE USUARIO').length,
      estado020Applications: uniqueApplications.filter(app => app.fileStatus === 'ESTADO-020').length,
      automaticRenewals: uniqueApplications.filter(app => app.isAutomaticRenewal === '1').length,
      manualApplications: uniqueApplications.filter(app => app.isAutomaticRenewal === '0').length,
      // Additional KPIs for procedures (use all records)
      totalProcedures: allApplicationRecords.length,
    };

    // Monthly applications data using SQLite query - COUNT unique applications only (last 6 months)
    const monthlyApplicationsData = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m', receivedDate) as month,
        COUNT(DISTINCT applicationCode) as totalApplications
      FROM applications
      WHERE receivedDate IS NOT NULL
        AND applicationCode IS NOT NULL
        AND receivedDate >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', receivedDate)
      ORDER BY month ASC
    `;

    // Calculate chart data - Use unique applications for application-level metrics
    const chartData = {
      statusDistribution: uniqueApplications.reduce((acc: any, app) => {
        const status = app.fileStatus || "NO DEFINIDO";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),

      // Procedure distribution uses ALL records (includes duplicates by design)
      procedureTypeDistribution: allApplicationRecords.reduce((acc: any, app) => {
        const procedureType = app.procedureTypeDescription || "NO DEFINIDO";
        acc[procedureType] = (acc[procedureType] || 0) + 1;
        return acc;
      }, {}),

      // Category distribution uses unique applications
      categoryDistribution: uniqueApplications.reduce((acc: any, app) => {
        const category = app.categoryDescription || "NO DEFINIDO";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),

      monthlyApplications: (monthlyApplicationsData as any[]).reduce((acc: any, row: any) => {
        acc[row.month] = Number(row.totalApplications) || 0;
        return acc;
      }, {}),

      renewalTypeDistribution: {
        'AUTOMATICA': uniqueApplications.filter(app => app.isAutomaticRenewal === '1').length,
        'MANUAL': uniqueApplications.filter(app => app.isAutomaticRenewal === '0').length,
      },

      cityDistribution: uniqueApplications.reduce((acc: any, app) => {
        const city = app.cityCode || "NO DEFINIDO";
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {}),

      serviceClassDistribution: uniqueApplications.reduce((acc: any, app) => {
        const serviceClass = app.serviceClassDescription || "NO DEFINIDO";
        acc[serviceClass] = (acc[serviceClass] || 0) + 1;
        return acc;
      }, {}),

      // Additional procedure-level analytics 
      procedureClassDistribution: allApplicationRecords.reduce((acc: any, app) => {
        const procedureClass = app.procedureClassDescription || "NO DEFINIDO";
        acc[procedureClass] = (acc[procedureClass] || 0) + 1;
        return acc;
      }, {}),
    };

    return {
      kpis,
      chartData,
      total: uniqueApplications.length, // Return unique applications count
      totalProcedures: allApplicationRecords.length // Also provide procedures count
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
      procedureTypeDescription,
      procedureClassDescription,
      categoryDescription,
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
    if (procedureTypeDescription) filters.procedureTypeDescription = { contains: procedureTypeDescription };
    if (procedureClassDescription) filters.procedureClassDescription = { contains: procedureClassDescription };
    if (categoryDescription) filters.categoryDescription = { contains: categoryDescription };
    if (plateId) filters.plateId = { contains: plateId };
    if (isAutomaticRenewal !== undefined) filters.isAutomaticRenewal = (String(isAutomaticRenewal) === 'true' || isAutomaticRenewal === true) ? '1' : '0';
    if (cityCode) filters.cityCode = cityCode;

    if (startDate && endDate) {
      filters['receivedDate'] = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get ALL detailed applications for procedures analysis
    const allFilteredApplications = await prisma.applications.findMany({
      where: filters
    });

    // Get UNIQUE applications for application-level analysis
    const uniqueFilteredApplications = await prisma.applications.findMany({
      where: filters,
      distinct: ['applicationCode']
    });

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Top applicants analysis - Group by applicant but count unique applications
    const topApplicantsRaw = await prisma.applications.groupBy({
      by: ['applicantName', 'companyName', 'applicationCode'],
      where: filters,
      _count: {
        id: true
      }
    });
    
    // Consolidate by applicant
    const applicantMap = new Map();
    topApplicantsRaw.forEach(item => {
      const key = `${item.applicantName || 'N/A'}-${item.companyName || 'N/A'}`;
      if (!applicantMap.has(key)) {
        applicantMap.set(key, {
          applicantName: item.applicantName,
          companyName: item.companyName,
          count: 0
        });
      }
      applicantMap.get(key).count += 1;
    });
    
    const topApplicants = Array.from(applicantMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Procedure type analysis - Count ALL procedures (not unique applications)
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

    // Processing efficiency analysis - Use UNIQUE applications for rates
    const processingAnalysis = {
      totalApplications: uniqueFilteredApplications.length,
      activeApplications: uniqueFilteredApplications.filter(app => app.fileStatus === 'ACTIVO').length,
      finalizedApplications: uniqueFilteredApplications.filter(app => app.fileStatus === 'FINALIZADO').length,
      inactiveApplications: uniqueFilteredApplications.filter(app => app.fileStatus === 'INACTIVO').length,
      errorApplications: uniqueFilteredApplications.filter(app => app.fileStatus === 'RETROTRAIDO POR ERROR DE USUARIO').length,
      estado020Applications: uniqueFilteredApplications.filter(app => app.fileStatus === 'ESTADO-020').length,
      activeRate: uniqueFilteredApplications.length > 0 ?
        (uniqueFilteredApplications.filter(app => app.fileStatus === 'ACTIVO').length / uniqueFilteredApplications.length) * 100 : 0,
      finalizedRate: uniqueFilteredApplications.length > 0 ?
        (uniqueFilteredApplications.filter(app => app.fileStatus === 'FINALIZADO').length / uniqueFilteredApplications.length) * 100 : 0,
      totalProcedures: allFilteredApplications.length
    };

    // Time-based trends - Use UNIQUE applications for trend analysis
    const currentMonthApplications = uniqueFilteredApplications.filter(app =>
      app.receivedDate && new Date(app.receivedDate) >= currentMonth
    );
    const lastMonthApplications = uniqueFilteredApplications.filter(app =>
      app.receivedDate &&
      new Date(app.receivedDate) >= lastMonth &&
      new Date(app.receivedDate) < currentMonth
    );
    const lastYearApplications = await prisma.applications.findMany({
      where: {
        ...filters,
        receivedDate: {
          gte: new Date(lastYear.getFullYear(), lastYear.getMonth(), 1).toISOString().split('T')[0],
          lte: new Date(lastYear.getFullYear(), lastYear.getMonth() + 1, 0).toISOString().split('T')[0]
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

    // Renewal type analysis - Use UNIQUE applications for renewal rates
    const renewalAnalysis = {
      automaticRenewals: uniqueFilteredApplications.filter(app => app.isAutomaticRenewal === '1').length,
      manualApplications: uniqueFilteredApplications.filter(app => app.isAutomaticRenewal === '0').length,
      automaticRenewalRate: uniqueFilteredApplications.length > 0 ?
        (uniqueFilteredApplications.filter(app => app.isAutomaticRenewal === '1').length / uniqueFilteredApplications.length) * 100 : 0
    };

    // City/regional distribution analysis - Use unique applications by city
    const cityPerformanceRaw = await prisma.applications.groupBy({
      by: ['cityCode', 'applicationCode'],
      where: filters,
      _count: {
        id: true
      }
    });
    
    // Consolidate by city (count unique applications per city)
    const cityMap = new Map();
    cityPerformanceRaw.forEach(item => {
      const city = item.cityCode || 'N/A';
      if (!cityMap.has(city)) {
        cityMap.set(city, { cityCode: city, count: 0 });
      }
      cityMap.get(city).count += 1;
    });
    
    const cityPerformance = Array.from(cityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate insights and recommendations
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Active rate insights
    if (processingAnalysis.activeRate < 70) {
      insights.push("Tasa de solicitudes activas por debajo del objetivo institucional (70%)");
      recommendations.push("Revisar procesos para aumentar el número de solicitudes activas");
    } else if (processingAnalysis.activeRate > 90) {
      insights.push("Excelente tasa de solicitudes activas, superando estándares institucionales");
    }

    // Trend insights
    if (trends.monthOverMonth.change > 20) {
      insights.push(`Incremento significativo del ${trends.monthOverMonth.change.toFixed(1)}% en solicitudes este mes`);
      recommendations.push("Evaluar capacidad operativa para procesar el incremento en solicitudes");
    } else if (trends.monthOverMonth.change < -20) {
      insights.push(`Disminución significativa del ${Math.abs(trends.monthOverMonth.change).toFixed(1)}% en solicitudes este mes`);
      recommendations.push("Analizar factores que pueden estar afectando el volumen de solicitudes");
    }

    // Inactive applications insights
    const inactiveApplications = processingAnalysis.inactiveApplications;
    if (inactiveApplications > 100) {
      insights.push(`${inactiveApplications} solicitudes inactivas identificadas`);
      recommendations.push("Analizar causas de inactividad y considerar medidas de reactivación");
    }
    
    // Error applications insights
    const errorApplications = processingAnalysis.errorApplications;
    if (errorApplications > 0) {
      insights.push(`${errorApplications} solicitudes con errores de usuario detectadas`);
      recommendations.push("Mejorar capacitación de usuarios para reducir errores en el sistema");
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
          totalApplications: uniqueFilteredApplications.length,
          totalProcedures: allFilteredApplications.length,
          activeRate: processingAnalysis.activeRate,
          finalizedRate: processingAnalysis.finalizedRate,
          activeApplications: processingAnalysis.activeApplications,
          automaticRenewalRate: renewalAnalysis.automaticRenewalRate,
          periodCovered: { startDate, endDate }
        },
        processingAnalysis,
        trends,
        renewalAnalysis,
        topApplicants: topApplicants.map(ta => ({
          applicantName: ta.applicantName || 'N/A',
          companyName: ta.companyName || 'N/A',
          applicationCount: ta.count
        })),
        procedureTypeAnalysis: procedureTypeAnalysis.map(pta => ({
          procedureType: pta.procedureTypeDescription || 'No especificado',
          count: pta._count.id,
          percentage: (pta._count.id / allFilteredApplications.length) * 100
        })),
        cityPerformance: cityPerformance.map(cp => ({
          cityCode: cp.cityCode || 'N/A',
          applicationsCount: cp.count,
          percentage: (cp.count / uniqueFilteredApplications.length) * 100
        })),
        insights,
        recommendations,
        sampleApplications: allFilteredApplications.slice(0, 50) // Include sample for supporting data
      }
    };
  } catch (error: any) {
    console.error('Error generating applications analytics report:', error);
    throw error.message;
  }
}

export async function getApplicationsDashboard(params: any): Promise<any> {
  try {
    // Get ALL application records for procedures analytics
    const allApplicationRecords = await prisma.applications.findMany();
    
    // Get UNIQUE applications for application-level KPIs
    const allUniqueApplications = await prisma.applications.findMany({
      distinct: ['applicationCode']
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // Recent applications (last 30 days) - Use unique applications
    const recentApplications = allUniqueApplications.filter(app =>
      app.receivedDate && new Date(app.receivedDate) >= thirtyDaysAgo
    );

    // Applications requiring attention (old inactive or error applications) - Use unique applications
    const stalledApplications = allUniqueApplications.filter(app =>
      (app.fileStatus === 'INACTIVO' || app.fileStatus === 'RETROTRAIDO POR ERROR DE USUARIO') &&
      app.receivedDate && new Date(app.receivedDate) < thirtyDaysAgo
    );

    // Dashboard KPIs - Use unique applications for application-level metrics
    const dashboardKpis = {
      totalApplications: allUniqueApplications.length,
      totalProcedures: allApplicationRecords.length,
      recentApplications: recentApplications.length,
      activeApplications: allUniqueApplications.filter(app => app.fileStatus === 'ACTIVO').length,
      finalizedApplications: allUniqueApplications.filter(app => app.fileStatus === 'FINALIZADO').length,
      inactiveApplications: allUniqueApplications.filter(app => app.fileStatus === 'INACTIVO').length,
      errorApplications: allUniqueApplications.filter(app => app.fileStatus === 'RETROTRAIDO POR ERROR DE USUARIO').length,
      estado020Applications: allUniqueApplications.filter(app => app.fileStatus === 'ESTADO-020').length,
      stalledApplications: stalledApplications.length,
      automaticRenewals: allUniqueApplications.filter(app => app.isAutomaticRenewal === '1').length,
      averageProcessingTime: 0 // Could be calculated based on receivedDate vs systemDate
    };

    // Quick stats for dashboard charts
    const quickStats = {
      // Status breakdown uses unique applications
      statusBreakdown: allUniqueApplications.reduce((acc: any, app) => {
        const status = app.fileStatus || "NO DEFINIDO";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),

      // Recent trend uses unique applications
      recentTrend: recentApplications.reduce((acc: any, app) => {
        const date = app.receivedDate ? new Date(app.receivedDate).toISOString().split('T')[0] : 'Sin fecha';
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}),

      // Procedure types use ALL records (procedure-level metric)
      topProcedureTypes: allApplicationRecords.reduce((acc: any, app) => {
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
      total: allUniqueApplications.length,
      totalProcedures: allApplicationRecords.length
    };
  } catch (error: any) {
    console.error('Error retrieving applications dashboard:', error);
    throw error.message;
  }
}
