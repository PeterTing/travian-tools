import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'
import { CurrentAccountProvider } from '@/contexts/CurrentAccountContext'
import { AccountDataProvider } from '@/contexts/AccountDataContext'
import { AutoFillProvider } from '@/components/autofill/AutoFillContext'
import CalcFrame from '@/components/autofill/CalcFrame'
import ExternalLinksPage from '@/pages/ExternalLinksPage'
import IncomingListPage from '@/pages/calculator/IncomingListPage'
import FieldsPage from '@/pages/calculator/guide/FieldsPage'
import AppShell from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth'
import HomePage from '@/pages/HomePage'
import ParseConfirmPage from '@/pages/paste/ParseConfirmPage'
import MovementCoordsPage from '@/pages/paste/MovementCoordsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import MorePage from '@/pages/MorePage'
// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
// Database pages
import BuildingsPage from '@/pages/database/BuildingsPage'
import TroopsPage from '@/pages/database/TroopsPage'
import ResourcesPage from '@/pages/database/ResourcesPage'
// Calculator pages
import CalculatorsIndexPage from '@/pages/calculator/CalculatorsIndexPage'
import BuildingCalculatorPage from '@/pages/calculator/BuildingCalculatorPage'
import CropBalancePage from '@/pages/calculator/CropBalancePage'
// Advanced calculator pages
import PathCalculatorPage from '@/pages/calculator/PathCalculatorPage'
import InterceptionCalculatorPage from '@/pages/calculator/InterceptionCalculatorPage'
import TechnologyCalculatorPage from '@/pages/calculator/TechnologyCalculatorPage'
import NpcCalculatorPage from '@/pages/calculator/NpcCalculatorPage'
import SaveTroopsCalculatorPage from '@/pages/calculator/SaveTroopsCalculatorPage'
import PathSpeedTsCalculatorPage from '@/pages/calculator/PathSpeedTsCalculatorPage'
// Phase 1 new calculators (2026-04)
import CropScouterPage from '@/pages/calculator/CropScouterPage'
import AttackPlannerPage from '@/pages/calculator/AttackPlannerPage'
import OasisRoiPage from '@/pages/calculator/guide/OasisRoiPage'
import PassiveCpPage from '@/pages/calculator/guide/PassiveCpPage'
import BuildOrderPage from '@/pages/calculator/guide/BuildOrderPage'
import TraderoutePage from '@/pages/calculator/guide/TraderoutePage'
import FarmingPage from '@/pages/calculator/guide/FarmingPage'
import LaunchSimPage from '@/pages/calculator/guide/LaunchSimPage'

// Game accounts page
import { GameAccountsPage } from '@/pages/game-accounts'
// Village pages
import VillagesPage from '@/pages/villages/VillagesPage'
import VillageDetailPage from '@/pages/villages/VillageDetailPage'
// Map pages
import MapSqlPage from '@/pages/map/MapSqlPage'
// Statistics pages
import {
  ServerOverviewPage,
  PlayerRankingPage,
  AllianceRankingPage,
  ConquestActivityPage,
  NameChangesPage,
  InactiveSearchPage,
} from '@/pages/statistics'
// Strategy pages
import { HealthCheckPage, OpeningChecklistPage } from '@/pages/strategy'

/** 路由與外框（測試用：不含 Provider） */
export function AppContent() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/paste/confirm"
          element={
            <RequireAuth>
              <ParseConfirmPage />
            </RequireAuth>
          }
        />
        <Route
          path="/paste/confirm/:draftId"
          element={
            <RequireAuth>
              <ParseConfirmPage />
            </RequireAuth>
          }
        />
        <Route
          path="/paste/movement/:movementId"
          element={
            <RequireAuth>
              <MovementCoordsPage />
            </RequireAuth>
          }
        />
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Database routes */}
        <Route path="/database/buildings" element={<BuildingsPage />} />
        <Route path="/database/troops" element={<CalcFrame usesVillage={false}><TroopsPage /></CalcFrame>} />
        <Route path="/database/resources" element={<ResourcesPage />} />
        {/* Calculator routes（IA v2.2：每個計算器最上面都有「已帶入」列） */}
        <Route path={ROUTES.CALCULATOR.INDEX} element={<CalculatorsIndexPage />} />
        {/* 戰鬥模擬：P1-06 照公式重寫前隱藏，舊網址轉回首頁 */}
        <Route path="/calculator/battle" element={<Navigate to="/" replace />} />
        <Route path="/calculator/building" element={<CalcFrame usesVillage={false}><BuildingCalculatorPage /></CalcFrame>} />
        <Route path="/calculator/crop" element={<CalcFrame><CropBalancePage /></CalcFrame>} />
        <Route path="/calculator/path" element={<CalcFrame><PathCalculatorPage /></CalcFrame>} />
        <Route path="/calculator/interception" element={<CalcFrame><InterceptionCalculatorPage /></CalcFrame>} />
        <Route path="/calculator/technology" element={<CalcFrame usesVillage={false}><TechnologyCalculatorPage /></CalcFrame>} />
        <Route path="/calculator/npc" element={<CalcFrame usesVillage={false}><NpcCalculatorPage /></CalcFrame>} />
        <Route path="/calculator/save-troops" element={<CalcFrame><SaveTroopsCalculatorPage /></CalcFrame>} />
        <Route path="/calculator/path-speed-ts" element={<CalcFrame><PathSpeedTsCalculatorPage /></CalcFrame>} />
        <Route path="/calculator/crop-scouter" element={<CalcFrame usesVillage={false}><CropScouterPage /></CalcFrame>} />
        <Route path="/calculator/attack-planner" element={<CalcFrame><AttackPlannerPage /></CalcFrame>} />
        <Route path={ROUTES.CALCULATOR.INCOMING} element={<RequireAuth><IncomingListPage /></RequireAuth>} />
        <Route path={ROUTES.CALCULATOR.FIELDS} element={<CalcFrame><FieldsPage /></CalcFrame>} />
        <Route path="/calculator/oasis-roi" element={<CalcFrame><OasisRoiPage /></CalcFrame>} />
        <Route path="/calculator/passive-cp" element={<PassiveCpPage />} />
        <Route path="/calculator/build-order" element={<CalcFrame><BuildOrderPage /></CalcFrame>} />
        <Route path="/calculator/trade-route" element={<CalcFrame><TraderoutePage /></CalcFrame>} />
        <Route path="/calculator/farming" element={<CalcFrame><FarmingPage /></CalcFrame>} />
        <Route path="/calculator/launch-sim" element={<CalcFrame usesVillage={false}><LaunchSimPage /></CalcFrame>} />
        {/* 舊網址 → 新頁面 */}
        <Route path="/calculator/field-roi" element={<Navigate to={ROUTES.CALCULATOR.FIELDS} replace />} />
        <Route path="/calculator/crop-sim" element={<Navigate to={`${ROUTES.CALCULATOR.FIELDS}?mode=capital`} replace />} />
        <Route path="/calculator/roi" element={<Navigate to={ROUTES.CALCULATOR.FIELDS} replace />} />
        <Route path="/calculator/culture-points" element={<Navigate to="/calculator/passive-cp" replace />} />
        <Route path="/calculator/village-builder" element={<Navigate to="/calculator/build-order" replace />} />
        <Route path={ROUTES.EXTERNAL_LINKS} element={<ExternalLinksPage />} />

        {/* Statistics routes - 公開 */}
        <Route path="/statistics/overview" element={<ServerOverviewPage />} />
        <Route path="/statistics/players" element={<PlayerRankingPage />} />
        <Route path="/statistics/alliances" element={<AllianceRankingPage />} />
        <Route path="/statistics/conquests" element={<ConquestActivityPage />} />
        <Route path="/statistics/name-changes" element={<NameChangesPage />} />
        <Route path="/statistics/search/inactives" element={<InactiveSearchPage />} />
        {/* Protected routes - 需要登入 */}
        <Route path="/game-accounts" element={<RequireAuth><GameAccountsPage /></RequireAuth>} />
        {/* 新增帳號或世界：頂部切換清單和擴充的「新增遊戲帳號」都連到這裡 */}
        <Route path={ROUTES.GAME_ACCOUNTS_NEW} element={<RequireAuth><GameAccountsPage startWithCreate /></RequireAuth>} />
        <Route path="/villages" element={<RequireAuth><VillagesPage /></RequireAuth>} />
        <Route path="/villages/:villageId" element={<RequireAuth><VillageDetailPage /></RequireAuth>} />
        <Route path="/map-sql" element={<RequireAuth><MapSqlPage /></RequireAuth>} />
        {/* 手機底部「更多」 */}
        <Route path={ROUTES.MORE} element={<MorePage />} />
        {/* Strategy routes */}
        <Route path={ROUTES.STRATEGY.OPENING} element={<RequireAuth><OpeningChecklistPage /></RequireAuth>} />
        <Route path="/strategy/health-check" element={<RequireAuth><HealthCheckPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

function App() {
  return (
    <AuthProvider>
      <CurrentAccountProvider>
        <AccountDataProvider>
          <AutoFillProvider>
            <AppContent />
          </AutoFillProvider>
        </AccountDataProvider>
      </CurrentAccountProvider>
    </AuthProvider>
  )
}

export default App
