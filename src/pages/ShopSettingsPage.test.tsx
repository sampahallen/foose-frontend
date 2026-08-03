import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShopSettingsPage } from './ShopSettingsPage'

const mocks = vi.hoisted(() => ({
  apiPut: vi.fn(),
}))

vi.mock('../lib/api', () => ({
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
  useApiResource: () => ({
    data: { shop: { _id: 'shop-1', payoutMethod: { accountName: 'Mobile Owner', accountNumber: '0240000000', provider: 'MTN', type: 'mobile_money' }, shopName: 'Seller Shop', slug: 'seller-shop' } },
    error: '',
    errorMeta: null,
    initialLoading: false,
    loading: false,
    refetch: vi.fn(),
    refreshing: false,
  }),
}))

describe('ShopSettingsPage', () => {
  beforeEach(() => {
    mocks.apiPut.mockReset().mockResolvedValue({ shop: { _id: 'shop-1' } })
  })

  it('switches the payout fields and saves the section from its header action', async () => {
    render(<ShopSettingsPage />)

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

  it('previews the public shop brand layout and opens ratio-specific asset editors', () => {
    render(<ShopSettingsPage />)

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
