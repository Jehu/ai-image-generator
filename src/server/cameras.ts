import { createServerFn } from '@tanstack/react-start'

// Prisma serverseitig dynamisch laden (Client-Bundle-Leak vermeiden).
const db = async () => (await import('#/db')).prisma

/** Eigene (vom Nutzer hinzugefügte) Kamera-Bodys. Defaults stehen statisch
 *  in der Taxonomie und werden clientseitig dazugemischt. */
export const listCameraBodies = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<string>> => {
    const prisma = await db()
    const rows = await prisma.cameraBody.findMany({ orderBy: { name: 'asc' } })
    return rows.map((r) => r.name)
  },
)

export const addCameraBody = createServerFn({ method: 'POST' })
  .validator((input: { name: string }) => {
    const name = input?.name?.trim()
    if (!name) throw new Error('Name erforderlich.')
    return { name }
  })
  .handler(async ({ data }): Promise<Array<string>> => {
    const prisma = await db()
    await prisma.cameraBody.upsert({
      where: { name: data.name },
      update: {},
      create: { name: data.name },
    })
    const rows = await prisma.cameraBody.findMany({ orderBy: { name: 'asc' } })
    return rows.map((r) => r.name)
  })

export const deleteCameraBody = createServerFn({ method: 'POST' })
  .validator((input: { name: string }) => input)
  .handler(async ({ data }): Promise<Array<string>> => {
    const prisma = await db()
    await prisma.cameraBody.deleteMany({ where: { name: data.name } })
    const rows = await prisma.cameraBody.findMany({ orderBy: { name: 'asc' } })
    return rows.map((r) => r.name)
  })
