import { Navigate, Route, Routes } from 'react-router-dom'
import { SignUpPage } from './pages/SignUpPage.tsx'
import { SignInPage } from './pages/SignInPage.tsx'
import { WorkspacePage } from './pages/WorkspacePage.tsx'
import { CompanyManagementPage } from './pages/CompanyManagementPage.tsx'
import { PropertyDetailsPage } from './pages/PropertyDetailsPage.tsx'
import { SuperAdminOverviewPage } from './pages/SuperAdminOverviewPage.tsx'
import { SuperAdminCompaniesPage } from './pages/SuperAdminCompaniesPage.tsx'
import { SuperAdminVisitsPage } from './pages/SuperAdminVisitsPage.tsx'
import { SuperAdminShoppersPage } from './pages/SuperAdminShoppersPage.tsx'
import { SuperAdminShopperDetailsPage } from './pages/SuperAdminShopperDetailsPage.tsx'
import { SuperAdminVisitReportPage } from './pages/SuperAdminVisitReportPage.tsx'
import { CompanyVisitsPage } from './pages/CompanyVisitsPage.tsx'
import { CompanyVisitReportPage } from './pages/CompanyVisitReportPage.tsx'
import { CompanyInvoicesPage } from './pages/CompanyInvoicesPage.tsx'
import { CompanyUserManagementPage } from './pages/CompanyUserManagementPage.tsx'
import { BenchmarkingPage } from './pages/BenchmarkingPage.tsx'
import { ActionPlansPage } from './pages/ActionPlansPage.tsx'
import { SuperAdminInvoicesPage } from './pages/SuperAdminInvoicesPage.tsx'
import { SuperAdminAccountManagersPage } from './pages/SuperAdminAccountManagersPage.tsx'
import { UpdatePasswordPage } from './pages/UpdatePasswordPage.tsx'
import { ShopperInfoPage } from './pages/ShopperInfoPage.tsx'
import { AccountPage } from './pages/AccountPage.tsx'
import { WorkspaceIndexRedirect } from './pages/workspace/WorkspaceIndexRedirect.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/account/update-password" element={<UpdatePasswordPage />} />
      <Route path="/workspace" element={<WorkspacePage />}>
        <Route index element={<WorkspaceIndexRedirect />} />
        <Route path="company" element={<CompanyManagementPage />} />
        <Route path="company/users" element={<CompanyUserManagementPage />} />
        <Route
          path="company/properties/:propertyId"
          element={<PropertyDetailsPage />}
        />
        <Route path="visits" element={<CompanyVisitsPage />} />
        <Route path="visits/:visitId" element={<CompanyVisitReportPage />} />
        <Route path="invoices" element={<CompanyInvoicesPage />} />
        <Route path="benchmarking" element={<BenchmarkingPage />} />
        <Route path="action-plans" element={<ActionPlansPage />} />
        <Route path="profile" element={<Navigate to="account/profile" replace />} />
        <Route path="shopper-info" element={<ShopperInfoPage />} />
        <Route path="account">
          <Route index element={<Navigate to="profile" replace />} />
          <Route path=":tab" element={<AccountPage />} />
        </Route>
        <Route path="admin/overview" element={<SuperAdminOverviewPage />} />
        <Route path="admin/companies" element={<SuperAdminCompaniesPage />} />
        <Route
          path="admin/companies/:companyId"
          element={<CompanyManagementPage />}
        />
        <Route
          path="admin/companies/:companyId/users"
          element={<CompanyUserManagementPage />}
        />
        <Route
          path="admin/companies/:companyId/action-plans"
          element={<ActionPlansPage />}
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
        <Route path="admin/shoppers/:shopperId" element={<SuperAdminShopperDetailsPage />} />
        <Route path="admin/account-managers" element={<SuperAdminAccountManagersPage />} />
        <Route path="admin/invoices" element={<SuperAdminInvoicesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  )
}

export default App
