import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSePayVietQrImageUrl } from '../../config/sepay.js'

describe('SePay VietQR URL generation', () => {
  it('uses the configured beneficiary with the exact order amount and memo', () => {
    const transferContent = 'DH55af97da-8bbf-4bfd-b7e2-a9f804080de1'
    const url = new URL(buildSePayVietQrImageUrl({
      bankCode: 'VCB',
      accountNumber: '0123456789',
      amount: 3000,
      transferContent,
      accountName: 'YOUR VOICE ENGLISH',
    }))

    assert.equal(url.origin + url.pathname, 'https://vietqr.app/img')
    assert.equal(url.searchParams.get('acc'), '0123456789')
    assert.equal(url.searchParams.get('bank'), 'VCB')
    assert.equal(url.searchParams.get('amount'), '3000')
    assert.equal(url.searchParams.get('des'), transferContent)
    assert.equal(url.searchParams.get('holder'), 'YOUR VOICE ENGLISH')
    assert.equal(url.searchParams.get('template'), 'compact')
  })
})
