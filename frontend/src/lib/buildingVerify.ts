import { isBuildingEffectVerified, isBuildingVerified } from '@/data/gameData'

/** 數字（花費、時間…）和效果都核對過才算「✓ 已核對」（#34：效果待驗證的 5 棟不能有 ✓） */
export function isBuildingFullyVerified(buildingId: string): boolean {
  return isBuildingVerified(buildingId) && isBuildingEffectVerified(buildingId)
}

/** 建築列表那一列的 aria-label：效果待驗證時加「效果待驗證」 */
export function buildingRowLabel(name: string, buildingId: string, effectPendingText: string): string {
  return isBuildingVerified(buildingId) && !isBuildingEffectVerified(buildingId) ? `${name}，${effectPendingText}` : name
}
