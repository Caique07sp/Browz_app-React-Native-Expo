import { contarPendentes } from "./offlineQueue";

export async function contarPendencias(): Promise<number> {
  return await contarPendentes();
}
