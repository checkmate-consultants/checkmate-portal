import { Navigate, Route, Routes } from 'react-router-dom'
import { SignUpPage } from './pages/SignUpPage.tsx'
import { SignInPage } from './pages/SignInPage.tsx'
import { WorkspacePage } from './pages/WorkspacePage.tsx'
import { CompanyOnboardingPage } from './pages/CompanyOnboardingPage.tsx'
import { CompanyManagementPage } from './pages/CompanyManagementPage.tsx'
import { PropertyDetailsPage } from './pages/PropertyDetailsPage.tsx'
import { SuperAdminCompaniesPage } from './pages/SuperAdminCompaniesPage.tsx'
import { SuperAdminVisitsPage } from './pages/SuperAdminVisitsPage.tsx'
import { SuperAdminShoppersPage } from './pages/SuperAdminShoppersPage.tsx'
import { SuperAdminVisitReportPage } from './pages/SuperAdminVisitReportPage.tsx'
import { CompanyVisitsPage } from './pages/CompanyVisitsPage.tsx'
import { CompanyVisitReportPage } from './pages/CompanyVisitReportPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/onboarding/company" element={<CompanyOnboardingPage />} />
      <Route path="/workspace" element={<WorkspacePage />}>
        <Route index element={<Navigate to="company" replace />} />
        <Route path="company" element={<CompanyManagementPage />} />
        <Route
          path="company/properties/:propertyId"
          element={<PropertyDetailsPage />}
        />
        <Route path="visits" element={<CompanyVisitsPage />} />
        <Route path="visits/:visitId" element={<CompanyVisitReportPage />} />
        <Route path="admin/companies" element={<SuperAdminCompaniesPage />} />
        <Route
          path="admin/companies/:companyId"
          element={<CompanyManagementPage />}
        />
        <Route
          path="admin/properties/:propertyId"
          element={<PropertyDetailsPage />}
        />
        <Route path="admin/visits" element={<SuperAdminVisitsPage />} />
        <Route
          path="admin/visits/:visitId/report"
          element={<SuperAdminVisitReportPage />}
        />
        <Route path="admin/shoppers" element={<SuperAdminShoppersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  )
}

export default App
