import { PrismaClient } from "../../prisma/client/rrhh";

const prisma = new PrismaClient();

export async function getArea(username: string): Promise<string> {
  const id: {ID_Empleado: string}[] = await prisma.$queryRaw`
    SELECT ID_Empleado  from IHTT_USUARIOS.dbo.TB_Usuarios tu 
    WHERE Usuario_Nombre = ${username}
  `
  const area = await prisma.tB_Empleado_Area_Cargo.findFirst({ where: { ID_Empleado: +id[0].ID_Empleado }, select: { ID_Area: true } });
  return area?.ID_Area || 'No area found';
}