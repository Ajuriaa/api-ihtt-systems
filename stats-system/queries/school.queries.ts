import { PrismaClient } from '../../prisma/client/stats-system';

const prisma = new PrismaClient();

export async function getSchoolCertificates(params: any): Promise<any> {
  try {
    // Extract filters and pagination parameters
    const { 
      noticeStatus, 
      transportType, 
      categoryDescription, 
      type, 
      dateType = 'issueDate',
      startDate, 
      endDate,
      searchTerm,
      paginated, 
      page = 1, 
      limit = 100 
    } = params;

    // Determine pagination values
    const shouldPaginate = paginated === 'true';
    const skip = shouldPaginate ? (parseInt(page, 10) - 1) * parseInt(limit, 10) : undefined;
    const take = shouldPaginate ? parseInt(limit, 10) : undefined;

    // Build filters dynamically
    const filters: any = {};

    if (noticeStatus) {
      filters.noticeStatus = noticeStatus;
    }

    if (transportType) {
      filters.transportType = transportType;
    }

    if (categoryDescription) {
      filters.categoryDescription = categoryDescription;
    }

    if (type) {
      filters.type = type;
    }

    // Apply search filter (searches across multiple fields)
    if (searchTerm) {
      filters.OR = [
        { dealerRtn: { contains: searchTerm } },
        { dealerName: { contains: searchTerm } },
        { certificateCode: { contains: searchTerm } }
      ];
    }

    // Apply date filter based on dateType
    if (startDate && endDate && dateType) {
      const dateField = dateType === 'preRegistration' ? 'preRegistrationDate' :
                       dateType === 'paid' ? 'paidCancelledDate' :
                       dateType === 'delivery' ? 'deliveryDate' :
                       'issueDate'; // default

      filters[dateField] = {
        gte: new Date(startDate as string).toISOString(),
        lte: new Date(endDate as string).toISOString(),
      };
    }

    // NO distinct needed - each school certificate has unique noticeCode
    const data = await prisma.school_certificates.findMany({
      where: filters,
      skip,
      take,
      orderBy: { issueDate: 'desc' }
    });

    // Get total count for pagination
    const total = shouldPaginate
      ? await prisma.school_certificates.count({
          where: filters,
        })
      : data.length;

    // Return the response
    return {
      data,
      total,
      page: shouldPaginate ? parseInt(page, 10) : undefined,
      pages: shouldPaginate ? Math.ceil(total / parseInt(limit, 10)) : undefined,
    };
  } catch (error: any) {
    console.error('Error retrieving school certificates:', error);
    throw error.message;
  }
}

export async function getSchoolCertificatesAnalytics(params: any): Promise<any> {
  try {
    const { 
      noticeStatus, 
      transportType, 
      categoryDescription, 
      type, 
      dateType = 'issueDate',
      startDate, 
      endDate,
      searchTerm 
    } = params;

    // Build base filters for filtered data
    const filters: any = {};

    if (noticeStatus) filters.noticeStatus = noticeStatus;
    if (transportType) filters.transportType = transportType;
    if (categoryDescription) filters.categoryDescription = categoryDescription;
    if (type) filters.type = type;

    // Apply search filter
    if (searchTerm) {
      filters.OR = [
        { dealerRtn: { contains: searchTerm } },
        { dealerName: { contains: searchTerm } },
        { certificateCode: { contains: searchTerm } }
      ];
    }

    // Apply date filter based on dateType for filtered data
    if (startDate && endDate && dateType) {
      const dateField = dateType === 'preRegistration' ? 'preRegistrationDate' :
                       dateType === 'paid' ? 'paidCancelledDate' :
                       dateType === 'delivery' ? 'deliveryDate' :
                       'issueDate'; // default

      filters[dateField] = {
        gte: new Date(startDate as string).toISOString(),
        lte: new Date(endDate as string).toISOString(),
      };
    }

    // Get filtered school certificates (NO distinct needed)
    const filteredCertificates = await prisma.school_certificates.findMany({
      where: filters,
    });

    // Get global data (all certificates, no filters)
    const globalCertificates = await prisma.school_certificates.findMany({
      where: {} // No filters for global data
    });

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Calculate FILTERED KPIs
    const filteredKpis = {
      totalCertificates: filteredCertificates.length,
      totalRevenue: filteredCertificates.reduce((sum, cert) => sum + (cert.amount || 0), 0),
      paymentRate: filteredCertificates.length > 0 ? 
        (filteredCertificates.filter(cert => cert.noticeStatus === 'PAGADO').length / filteredCertificates.length) * 100 : 0,
      averageProcessingTime: calculateAverageProcessingTime(filteredCertificates)
    };

    // Calculate GLOBAL KPIs
    const globalKpis = {
      totalCertificates: globalCertificates.length,
      unpaidCertificates: globalCertificates.filter(cert => cert.noticeStatus !== 'PAGADO').length,
      overallPaymentRate: globalCertificates.length > 0 ?
        (globalCertificates.filter(cert => cert.noticeStatus === 'PAGADO').length / globalCertificates.length) * 100 : 0,
      totalOutstandingAmount: globalCertificates
        .filter(cert => cert.noticeStatus !== 'PAGADO')
        .reduce((sum, cert) => sum + (cert.amount || 0), 0)
    };

    // Get last 6 months revenue trend (global data)
    const monthlyRevenueData = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m', issueDate) as month,
        SUM(amount) as totalAmount
      FROM school_certificates
      WHERE issueDate >= ${sixMonthsAgo.toISOString()}
        AND issueDate IS NOT NULL
        AND amount IS NOT NULL
      GROUP BY strftime('%Y-%m', issueDate)
      ORDER BY month DESC
      LIMIT 6
    `;

    // Get annual overview (global data)
    const annualOverviewData = await prisma.$queryRaw`
      SELECT
        strftime('%Y', issueDate) as year,
        COUNT(*) as count
      FROM school_certificates
      WHERE issueDate IS NOT NULL
      GROUP BY strftime('%Y', issueDate)
      ORDER BY year DESC
    `;

    // Get category performance (global data with payment status)
    const categoryPerformanceData = await prisma.school_certificates.groupBy({
      by: ['categoryDescription', 'noticeStatus'],
      _count: {
        id: true
      },
      where: {} // Global data
    });

    // Calculate processing efficiency by month (global data)
    const processingEfficiencyData = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m', issueDate) as month,
        AVG(
          CASE 
            WHEN preRegistrationDate IS NOT NULL AND issueDate IS NOT NULL 
            THEN julianday(issueDate) - julianday(preRegistrationDate)
            ELSE NULL
          END
        ) as avgDays
      FROM school_certificates
      WHERE issueDate IS NOT NULL
        AND preRegistrationDate IS NOT NULL
      GROUP BY strftime('%Y-%m', issueDate)
      ORDER BY month DESC
      LIMIT 12
    `;

    // Format chart data
    const chartData = {
      // Filtered data charts
      filtered: {
        monthlyRevenue: (monthlyRevenueData as any[]).map(row => ({
          month: row.month,
          amount: Number(row.totalAmount) || 0
        })),
        statusDistribution: filteredCertificates.reduce((acc: any, cert) => {
          const status = cert.noticeStatus || 'DESCONOCIDO';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
        transportTypeBreakdown: filteredCertificates.reduce((acc: any, cert) => {
          const type = cert.transportType || 'DESCONOCIDO';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        categoryDistribution: filteredCertificates.reduce((acc: any, cert) => {
          const category = cert.categoryDescription || 'DESCONOCIDO';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {})
      },
      // Global data charts
      global: {
        annualOverview: (annualOverviewData as any[]).map(row => ({
          year: parseInt(row.year),
          count: Number(row.count) || 0
        })),
        categoryPerformance: formatCategoryPerformance(categoryPerformanceData),
        processingEfficiency: (processingEfficiencyData as any[]).map(row => ({
          month: row.month,
          avgDays: Math.round(Number(row.avgDays) || 0)
        })),
        globalTransportDistribution: globalCertificates.reduce((acc: any, cert) => {
          const type = cert.transportType || 'DESCONOCIDO';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      }
    };

    return {
      filtered: filteredKpis,
      global: globalKpis,
      chartData,
      total: filteredCertificates.length
    };
  } catch (error: any) {
    console.error('Error retrieving school certificates analytics:', error);
    throw error.message;
  }
}

export async function getSchoolCertificatesAnalyticsReport(params: any): Promise<any> {
  try {
    // Get base analytics data
    const analyticsData = await getSchoolCertificatesAnalytics(params);

    const { 
      noticeStatus, 
      transportType, 
      categoryDescription, 
      type, 
      dateType = 'issueDate',
      startDate, 
      endDate,
      searchTerm 
    } = params;

    // Build filters for detailed analysis
    const filters: any = {};

    if (noticeStatus) filters.noticeStatus = noticeStatus;
    if (transportType) filters.transportType = transportType;
    if (categoryDescription) filters.categoryDescription = categoryDescription;
    if (type) filters.type = type;

    // Apply search filter
    if (searchTerm) {
      filters.OR = [
        { dealerRtn: { contains: searchTerm } },
        { dealerName: { contains: searchTerm } },
        { certificateCode: { contains: searchTerm } }
      ];
    }

    if (startDate && endDate && dateType) {
      const dateField = dateType === 'preRegistration' ? 'preRegistrationDate' :
                       dateType === 'paid' ? 'paidCancelledDate' :
                       dateType === 'delivery' ? 'deliveryDate' :
                       'issueDate';

      filters[dateField] = {
        gte: new Date(startDate as string).toISOString(),
        lte: new Date(endDate as string).toISOString(),
      };
    }

    // Get detailed certificates for insights
    const filteredCertificates = await prisma.school_certificates.findMany({
      where: filters,
    });

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Top categories analysis
    const topCategories = await prisma.school_certificates.groupBy({
      by: ['categoryDescription'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        amount: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Transport type analysis
    const transportAnalysis = await prisma.school_certificates.groupBy({
      by: ['transportType'],
      where: filters,
      _count: {
        id: true
      },
      _sum: {
        amount: true
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
      totalPaid: filteredCertificates.filter(c => c.noticeStatus === 'PAGADO').length,
      totalActive: filteredCertificates.filter(c => c.noticeStatus === 'ACTIVO').length,
      totalCancelled: filteredCertificates.filter(c => c.noticeStatus === 'ANULADO').length,
      totalRevenue: filteredCertificates.filter(c => c.noticeStatus === 'PAGADO').reduce((sum, c) => sum + (c.amount || 0), 0),
      paymentRate: filteredCertificates.length > 0 ?
        (filteredCertificates.filter(c => c.noticeStatus === 'PAGADO').length / filteredCertificates.length) * 100 : 0
    };

    // Time-based trends
    const currentMonthCerts = filteredCertificates.filter(cert =>
      cert.issueDate && new Date(cert.issueDate) >= currentMonth
    );
    const lastMonthCerts = filteredCertificates.filter(cert =>
      cert.issueDate &&
      new Date(cert.issueDate) >= lastMonth &&
      new Date(cert.issueDate) < currentMonth
    );

    // Get same period last year for comparison
    const lastYearCerts = await prisma.school_certificates.findMany({
      where: {
        ...filters,
        issueDate: {
          gte: new Date(lastYear.getFullYear(), lastYear.getMonth(), 1).toISOString(),
          lte: new Date(lastYear.getFullYear(), lastYear.getMonth() + 1, 0).toISOString()
        }
      }
    });

    const trends = {
      monthOverMonth: {
        current: currentMonthCerts.length,
        previous: lastMonthCerts.length,
        change: lastMonthCerts.length > 0 ?
          ((currentMonthCerts.length - lastMonthCerts.length) / lastMonthCerts.length) * 100 : 0,
        revenue: {
          current: currentMonthCerts.reduce((sum, c) => sum + (c.amount || 0), 0),
          previous: lastMonthCerts.reduce((sum, c) => sum + (c.amount || 0), 0)
        }
      },
      yearOverYear: {
        current: currentMonthCerts.length,
        previous: lastYearCerts.length,
        change: lastYearCerts.length > 0 ?
          ((currentMonthCerts.length - lastYearCerts.length) / lastYearCerts.length) * 100 : 0
      }
    };

    // Generate insights and recommendations
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Payment rate insights (target is 70%)
    if (revenueAnalysis.paymentRate < 70) {
      insights.push(`Tasa de pago del ${revenueAnalysis.paymentRate.toFixed(1)}% por debajo del objetivo institucional (70%)`);
      recommendations.push("Implementar recordatorios automáticos para pagos pendientes de certificados escolares");
    } else if (revenueAnalysis.paymentRate > 85) {
      insights.push("Excelente tasa de pago, superando estándares institucionales");
    }

    // Trend insights
    if (trends.monthOverMonth.change > 20) {
      insights.push(`Incremento significativo del ${trends.monthOverMonth.change.toFixed(1)}% en certificados escolares este mes`);
      recommendations.push("Evaluar capacidad operativa para mantener calidad de servicio en certificados escolares");
    } else if (trends.monthOverMonth.change < -20) {
      insights.push(`Disminución significativa del ${Math.abs(trends.monthOverMonth.change).toFixed(1)}% en certificados escolares este mes`);
      recommendations.push("Analizar factores que pueden estar afectando la demanda de certificados escolares");
    }

    // Category insights
    const topCategory = topCategories[0];
    if (topCategory && topCategory._count.id > filteredCertificates.length * 0.4) {
      insights.push(`${topCategory.categoryDescription} representa el ${((topCategory._count.id / filteredCertificates.length) * 100).toFixed(1)}% de certificados escolares`);
    }

    // Processing time insights
    const processingTimes = filteredCertificates
      .filter(cert => cert.preRegistrationDate && cert.issueDate)
      .map(cert => {
        const preReg = new Date(cert.preRegistrationDate!);
        const issue = new Date(cert.issueDate!);
        return (issue.getTime() - preReg.getTime()) / (1000 * 60 * 60 * 24);
      });

    if (processingTimes.length > 0) {
      const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      if (avgProcessingTime > 15) {
        insights.push(`Tiempo promedio de procesamiento de ${avgProcessingTime.toFixed(1)} días puede mejorarse`);
        recommendations.push("Optimizar procesos internos para reducir tiempo de emisión de certificados escolares");
      }
    }

    // Comparison metrics (filtered vs global)
    const comparisonMetrics = {
      paymentRateComparison: {
        filtered: revenueAnalysis.paymentRate,
        global: analyticsData.global.overallPaymentRate,
        difference: revenueAnalysis.paymentRate - analyticsData.global.overallPaymentRate
      },
      volumeComparison: {
        filtered: filteredCertificates.length,
        global: analyticsData.global.totalCertificates,
        percentage: (filteredCertificates.length / analyticsData.global.totalCertificates) * 100
      }
    };

    return {
      ...analyticsData,
      reportAnalysis: {
        executiveSummary: {
          totalCertificates: filteredCertificates.length,
          totalRevenue: revenueAnalysis.totalRevenue,
          paymentRate: revenueAnalysis.paymentRate,
          targetAchievement: revenueAnalysis.paymentRate >= 70 ? 'CUMPLIDO' : 'PENDIENTE'
        },
        trends,
        topCategories: topCategories.map(tc => ({
          category: tc.categoryDescription || 'No especificado',
          count: tc._count.id,
          totalAmount: tc._sum.amount || 0,
          percentage: (tc._count.id / filteredCertificates.length) * 100
        })),
        transportAnalysis: transportAnalysis.map(ta => ({
          transportType: ta.transportType || 'No especificado',
          count: ta._count.id,
          totalAmount: ta._sum.amount || 0,
          percentage: (ta._count.id / filteredCertificates.length) * 100
        })),
        revenueAnalysis,
        insights,
        recommendations,
        sampleData: filteredCertificates.slice(0, 50), // Supporting records
        comparisonMetrics
      }
    };
  } catch (error: any) {
    console.error('Error generating school certificates analytics report:', error);
    throw error.message;
  }
}

// Helper functions
function calculateAverageProcessingTime(certificates: any[]): number {
  const validProcessingTimes = certificates
    .filter(cert => cert.preRegistrationDate && cert.issueDate)
    .map(cert => {
      const preReg = new Date(cert.preRegistrationDate);
      const issue = new Date(cert.issueDate);
      return (issue.getTime() - preReg.getTime()) / (1000 * 60 * 60 * 24); // Convert to days
    });

  if (validProcessingTimes.length === 0) return 0;
  
  return Math.round(validProcessingTimes.reduce((sum, time) => sum + time, 0) / validProcessingTimes.length);
}

function formatCategoryPerformance(data: any[]): any {
  const result: any = {};
  
  data.forEach(item => {
    const category = item.categoryDescription || 'No especificado';
    const status = item.noticeStatus || 'DESCONOCIDO';
    
    if (!result[category]) {
      result[category] = { paid: 0, unpaid: 0 };
    }
    
    if (status === 'PAGADO') {
      result[category].paid += item._count.id;
    } else {
      result[category].unpaid += item._count.id;
    }
  });
  
  return result;
}