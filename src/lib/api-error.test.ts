import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { ApiError, errorMessage } from './api-error'

const issue = (kind: 'sold-out' | 'insufficient' | 'price-changed') => ({
  lineId: 'line_1',
  kind,
  message: 'technical',
  details: { name: 'Emerald Ape #042', edition: '1/50', available: 1, previousPrice: '1.19', price: '1.50' },
})

describe('errorMessage', () => {
  it('maps client-side failures', () => {
    expect(errorMessage(new ApiError('NETWORK', 'Network error.'))).toBe('Sem conexão com o servidor. Verifique sua rede e tente novamente.')
    expect(errorMessage(new ApiError('TIMEOUT', 'Request timed out.'))).toBe('O servidor demorou para responder. Tente novamente.')
    expect(errorMessage(new ApiError('UNKNOWN', 'Unexpected error.'))).toBe('Erro inesperado.')
    expect(errorMessage(new ApiError('TRANSIENT', 'Unexpected server response.', 502, { details: { reason: 'unexpectedResponse' } }))).toBe('Resposta inesperada do servidor.')
    expect(errorMessage(new Error('boom'))).toBe('Algo deu errado. Tente novamente.')
    expect(errorMessage(new Error('boom'), '')).toBe('')
  })

  it('maps API codes and reasons to the pt-BR messages', () => {
    expect(errorMessage(new ApiError('TRANSIENT', 'Service unavailable.'))).toBe('Serviço indisponível. Tente novamente.')
    expect(errorMessage(new ApiError('TRANSIENT', 'x', 503, { details: { reason: 'favorites' } }))).toBe('Não foi possível atualizar os favoritos.')
    expect(errorMessage(new ApiError('WALLET_REFUSED', 'x'))).toBe('A carteira recusou a conexão.')
    expect(errorMessage(new ApiError('SESSION_EXPIRED', 'x'))).toBe('Sua sessão expirou. Entre novamente.')
    expect(errorMessage(new ApiError('UNAUTHENTICATED', 'x', 401, { details: { reason: 'invalidCredentials' } }))).toBe('E-mail ou senha incorretos.')
    expect(errorMessage(new ApiError('COUPON_INVALID', 'x'))).toBe('Cupom inválido.')
    expect(errorMessage(new ApiError('COUPON_EXPIRED', 'x'))).toBe('Este cupom expirou.')
    expect(errorMessage(new ApiError('QUOTE_STALE', 'x'))).toBe('A cotação mudou. Revise os valores antes de confirmar.')
    expect(errorMessage(new ApiError('NOT_FOUND', 'x', 404, { details: { reason: 'order' } }))).toBe('Pedido não encontrado.')
    expect(errorMessage(new ApiError('CONFLICT', 'x', 409, { details: { reason: 'walletIsPrimary' } }))).toBe('Esta carteira já está cadastrada como principal.')
    expect(errorMessage(new ApiError('VALIDATION', 'x', 422, { details: { reason: 'unknownReason' } }))).toBe('Verifique os campos informados.')
  })

  it('uses the availability details', () => {
    expect(errorMessage(new ApiError('AVAILABILITY_CONFLICT', 'x', 409, { details: { reason: 'limit', limit: 3 } }))).toBe('Limite de 3 unidade(s) para esta edição.')
    expect(errorMessage(new ApiError('AVAILABILITY_CONFLICT', 'x', 409, { details: { reason: 'soldOut' } }))).toBe('Esta edição está esgotada.')
    const quote = { issues: [issue('price-changed'), issue('insufficient')] }
    expect(errorMessage(new ApiError('AVAILABILITY_CONFLICT', 'x', 409, { details: { quote } }))).toBe('Restam apenas 1 unidade(s) de Emerald Ape #042 (1/50).')
    expect(errorMessage(new ApiError('AVAILABILITY_CONFLICT', 'x', 409, { details: { quote: { issues: [issue('sold-out')] } } }))).toBe('Emerald Ape #042 (1/50) esgotou.')
    expect(errorMessage(new ApiError('AVAILABILITY_CONFLICT', 'x', 409, { details: { quote: { issues: [] } } }))).toBe('Itens indisponíveis.')
  })
})

describe('pt-BR plurals', () => {
  it('keeps "itens" for zero and "item" for one', () => {
    expect(i18n.t('layout.header.cart', { count: 0 })).toBe('Carrinho, 0 itens')
    expect(i18n.t('layout.header.cart', { count: 1 })).toBe('Carrinho, 1 item')
    expect(i18n.t('layout.header.cart', { count: 2 })).toBe('Carrinho, 2 itens')
    expect(i18n.t('detail.limit', { count: 1 })).toBe('Limite de 1 unidade para esta edição.')
    expect(i18n.t('detail.limit', { count: 5 })).toBe('Limite de 5 unidades para esta edição.')
  })
})
