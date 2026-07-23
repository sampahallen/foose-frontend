import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/feedback/ToastProvider'
import { useApiResource } from '../hooks/useApiResource'
import { SellerDashboardPage } from './SellerDashboardPage'

const mocks = vi.hoisted(() => ({
  apiPut: vi.fn(),
  activeListing: {
    _id: 'active-1',
    category: 'denim',
    color: 'blue',
    currency: 'GHS',
    gender: 'women',
    images: ['active.jpg'],
    price: 12000,
    size: 'M',
    status: 'active',
    title: 'Active denim jacket',
    type: 'retail',
  },
}))

vi.mock('../lib/api', () => ({
  apiDelete: vi.fn(),
  apiPut: mocks.apiPut,
}))

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      _id: 'seller-1',
      hasShop: true,
      isKycVerified: true,
      location: { city: 'Accra', region: 'Greater Accra' },
      name: 'Seller',
      username: 'seller',
    },
  }),
}))

vi.mock('../hooks/useApiResource', () => ({
  useApiResource: vi.fn((path: string) => {
    const base = {
      error: '', errorMeta: null, initialLoading: false, loading: false, refetch: vi.fn(), refreshing: false,
    }
    if (path === '/digishops/me') return { ...base, data: { shop: { _id: 'shop-1', payoutMethod: { accountName: 'Mobile Owner', accountNumber: '0240000000', provider: 'MTN', type: 'mobile_money' }, shopName: 'Seller Shop', slug: 'seller-shop' } } }
    if (path === '/orders/me/selling') return { ...base, data: { orders: [] } }
    if (path === '/listings/me?status=active') return { ...base, data: { listings: [mocks.activeListing] } }
    return { ...base, data: { listings: [] } }
  }),
}))

describe('SellerDashboardPage listing separation', () => {
  beforeEach(() => {
    mocks.apiPut.mockReset().mockResolvedValue({ shop: { _id: 'shop-1' } })
    vi.mocked(useApiResource).mockClear()
    HTMLElement.prototype.scrollIntoView = vi.fn()
    window.history.replaceState({}, '', '/manage-shop/listings')
  })

  it('loads only active inventory, has no status filter, and shows full card details', () => {
    render(<ToastProvider><SellerDashboardPage /></ToastProvider>)

    expect(useApiResource).toHaveBeenCalledWith('/listings/me?status=active', true)
    expect(screen.queryByRole('combobox', { name: /status/i })).not.toBeInTheDocument()
    expect(screen.getByText('Active denim jacket')).toBeVisible()
    for (const value of ['GHS 120.00', 'Denim', 'M', 'Women', 'Blue']) {
      expect(screen.getByText(value)).toBeVisible()
    }
    expect(screen.getAllByRole('link', { name: 'Drafts' })).not.toHaveLength(0)
    screen.getAllByRole('link', { name: 'Drafts' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/manage-shop/drafts')
    })
  })

  it('switches the payout fields and saves the section from its header action', async () => {
    window.history.replaceState({}, '', '/manage-shop/settings')
    render(<ToastProvider><SellerDashboardPage /></ToastProvider>)

    const payoutSection = screen.getByRole('heading', { name: 'Funds collection method' }).closest('section')
    expect(payoutSection).not.toBeNull()
    fireEvent.click(within(payoutSection!).getByRole('button', { name: 'Edit Funds collection method' }))
    expect(within(payoutSection!).getByRole('button', { name: 'Save Funds collection method changes' })).toHaveTextContent('Save changes')

    const providerSelect = document.getElementById('payoutProvider-native') as HTMLSelectElement
    expect(Array.from(providerSelect.options, (option) => option.text)).toEqual([
      'Select provider',
      'MTN',
      'Telecel (formerly Vodafone)',
      'AirtelTigo',
    ])

    fireEvent.change(document.getElementById('payoutMethodType-native')!, { target: { value: 'bank_transfer' } })

    expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument()
    const bankSelect = screen.getByRole('combobox', { name: 'Bank' })
    expect(bankSelect).toBeInTheDocument()
    const nativeBankSelect = document.getElementById('payoutBankName-native') as HTMLSelectElement
    expect(Array.from(nativeBankSelect.options, (option) => option.text)).toContain('Absa Bank Ghana LTD')
    fireEvent.change(nativeBankSelect, { target: { value: 'Absa Bank Ghana LTD' } })
    expect(screen.getByRole('combobox', { name: 'Branch' })).toBeEnabled()
    const branchSelect = document.getElementById('payoutBranch-native') as HTMLSelectElement
    expect(Array.from(branchSelect.options, (option) => option.text)).toContain('ABSA (GH) LTD-ACCRA MALL BRANCH')
    fireEvent.change(branchSelect, { target: { value: 'ABSA (GH) LTD-ACCRA MALL BRANCH' } })
    const accountName = screen.getByRole('textbox', { name: 'Account name' })
    const accountNumber = screen.getByRole('textbox', { name: 'Account number' })
    expect(accountName).toHaveValue('')
    expect(accountNumber).toHaveValue('')
    fireEvent.change(accountName, { target: { value: 'Ama Mensah' } })
    fireEvent.change(accountNumber, { target: { value: '1234567890' } })
    fireEvent.click(within(payoutSection!).getByRole('button', { name: 'Save Funds collection method changes' }))

    await waitFor(() => expect(mocks.apiPut).toHaveBeenCalledTimes(1))
    const submitted = mocks.apiPut.mock.calls[0][1] as FormData
    expect(submitted.get('payoutMethodType')).toBe('bank_transfer')
    expect(submitted.get('payoutBankName')).toBe('Absa Bank Ghana LTD')
    expect(submitted.get('payoutBranch')).toBe('ABSA (GH) LTD-ACCRA MALL BRANCH')
    expect(submitted.get('payoutAccountName')).toBe('Ama Mensah')
    expect(submitted.get('payoutAccountNumber')).toBe('1234567890')
    expect(submitted.has('shopName')).toBe(false)
    await waitFor(() => expect(within(payoutSection!).getByRole('button', { name: 'Edit Funds collection method' })).toBeEnabled())
  })

  it('routes the settings navigation to the selected page section', () => {
    window.history.replaceState({}, '', '/manage-shop/settings')
    render(<ToastProvider><SellerDashboardPage /></ToastProvider>)

    const section = document.getElementById('shop-payout')
    const settingsNavigation = screen.getByRole('navigation', { name: 'Shop settings sections' })
    fireEvent.click(within(settingsNavigation).getByRole('link', { name: 'Payout' }))

    expect(window.location.hash).toBe('#shop-payout')
    expect(section?.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('previews the public shop brand layout and opens ratio-specific asset editors', () => {
    window.history.replaceState({}, '', '/manage-shop/settings')
    render(<ToastProvider><SellerDashboardPage /></ToastProvider>)

    const preview = screen.getByTestId('shop-brand-preview')
    expect(within(preview).getByText('Seller Shop')).toBeVisible()
    expect(within(preview).getByRole('button', { name: 'Edit shop banner' })).toBeVisible()
    expect(within(preview).getByRole('button', { name: 'Edit shop logo' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Brand assets' })).not.toBeInTheDocument()
    expect(screen.queryByText('Public shop preview')).not.toBeInTheDocument()

    fireEvent.click(within(preview).getByRole('button', { name: 'Edit shop banner' }))
    expect(screen.getByRole('dialog', { name: 'Change shop banner' })).toBeVisible()
    expect(screen.getByLabelText('Choose shop banner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save shop banner' })).toBeDisabled()
  })
})
