import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'
import { CurrentAccountProvider } from '@/contexts/CurrentAccountContext'
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
import BattleSimulatorPage from '@/pages/calculator/BattleSimulatorPage'
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
import FieldRoiPage from '@/pages/calculator/guide/FieldRoiPage'
import OasisRoiPage from '@/pages/calculator/guide/OasisRoiPage'
import PassiveCpPage from '@/pages/calculator/guide/PassiveCpPage'
import BuildOrderPage from '@/pages/calculator/guide/BuildOrderPage'
import TraderoutePage from '@/pages/calculator/guide/TraderoutePage'
import FarmingPage from '@/pages/calculator/guide/FarmingPage'
import CropSimPage from '@/pages/calculator/guide/CropSimPage'
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

function AppContent() {
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
        <Route path="/database/troops" element={<TroopsPage />} />
        <Route path="/database/resources" element={<ResourcesPage />} />
        {/* Calculator routes */}
        <Route path={ROUTES.CALCULATOR.INDEX} element={<CalculatorsIndexPage />} />
        {/* 戰鬥模擬：P1-06 重寫完成前不放導覽入口（P0-11），路由先留著 */}
        <Route path="/calculator/building" element={<BuildingCalculatorPage />} />
        
        <Route path="/calculator/battle" element={<BattleSimulatorPage />} />
        <Route path="/calculator/crop" element={<CropBalancePage />} />
        {/* Advanced calculator routes */}
        <Route path="/calculator/path" element={<PathCalculatorPage />} />
        <Route path="/calculator/interception" element={<InterceptionCalculatorPage />} />
        
        <Route path="/calculator/technology" element={<TechnologyCalculatorPage />} />
        <Route path="/calculator/npc" element={<NpcCalculatorPage />} />
        <Route path="/calculator/save-troops" element={<SaveTroopsCalculatorPage />} />
        <Route path="/calculator/path-speed-ts" element={<PathSpeedTsCalculatorPage />} />
        {/* Phase 1 new calculators */}
        
        <Route path="/calculator/crop-scouter" element={<CropScouterPage />} />
        <Route path="/calculator/attack-planner" element={<AttackPlannerPage />} />

        {/* P0-09 guide calculators */}
        <Route path="/calculator/field-roi" element={<FieldRoiPage />} />
        <Route path="/calculator/oasis-roi" element={<OasisRoiPage />} />
        <Route path="/calculator/passive-cp" element={<PassiveCpPage />} />
        <Route path="/calculator/build-order" element={<BuildOrderPage />} />
        <Route path="/calculator/trade-route" element={<TraderoutePage />} />
        <Route path="/calculator/farming" element={<FarmingPage />} />
        <Route path="/calculator/crop-sim" element={<CropSimPage />} />
        <Route path="/calculator/launch-sim" element={<LaunchSimPage />} />
        {/* Duplicates → guide versions */}
        <Route path="/calculator/roi" element={<Navigate to="/calculator/field-roi" replace />} />
        <Route path="/calculator/culture-points" element={<Navigate to="/calculator/passive-cp" replace />} />
        <Route path="/calculator/village-builder" element={<Navigate to="/calculator/build-order" replace />} />

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
        <AppContent />
      </CurrentAccountProvider>
    </AuthProvider>
  )
}

export default App
