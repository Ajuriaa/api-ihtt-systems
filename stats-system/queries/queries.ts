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

    // Fetch data from Prisma
    const data = await prisma.certificates.findMany({
      where: filters,
      skip: paginated === 'true' ? (page - 1) * limit : undefined, // Skip only if paginated
      take: paginated === 'true' ? limit : undefined, // Take only if paginated
    });

    // Filtrar registros únicos basados en noticeCode
    const seenNoticeCodes = new Set();
    const uniqueData = data.filter((record) => {
      if (!seenNoticeCodes.has(record.noticeCode)) {
        seenNoticeCodes.add(record.noticeCode);
        return true;
      }
      return false;
    });

    // Count total records for pagination (only if paginated is true)
    const total = paginated === 'true' ? await prisma.certificates.count({ where: filters }) : data.length;

    // Return the response
    return {
      data: uniqueData,
      total,
      page: paginated === 'true' ? page : undefined,
      pages: paginated === 'true' ? Math.ceil(total / limit) : undefined,
    };
  } catch (error: any) {
    console.error('Error retrieving data:', error);
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
