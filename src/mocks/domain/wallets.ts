import type { WalletConnection, WalletConnectionInput, WalletInput, WalletsState } from '@/contracts/wallet'
import { db, nextId, persist, type UserRecord, type WalletSlots } from '../db/state'
import { MockHttpError } from '../http'

function slots(user: UserRecord): WalletSlots {
  return (db.wallets[user.id] ??= { primary: null, secondary: null, secondarySameAsPrimary: false })
}

export function getWallets(user: UserRecord): WalletsState {
  const state = slots(user)
  return {
    primary: state.primary,
    secondary: state.secondarySameAsPrimary ? state.primary : state.secondary,
    secondarySameAsPrimary: state.secondarySameAsPrimary,
  }
}

function assertUniqueAddress(user: UserRecord, slot: 'primary' | 'secondary', address: string) {
  const state = slots(user)
  const other = slot === 'primary' ? state.secondary : state.primary
  if (other && !state.secondarySameAsPrimary && other.address.toLowerCase() === address.toLowerCase()) {
    throw new MockHttpError('CONFLICT', 'Esta carteira já está cadastrada como ' + (slot === 'primary' ? 'secundária.' : 'principal.'), {
      address: 'Endereço já cadastrado na outra carteira.',
    })
  }
}

export function savePrimary(user: UserRecord, input: WalletInput) {
  assertUniqueAddress(user, 'primary', input.address)
  const state = slots(user)
  state.primary = { ...input, id: state.primary?.id ?? nextId('w'), slot: 'primary', updatedAt: new Date().toISOString() }
  persist()
  return getWallets(user)
}

export function saveSecondary(user: UserRecord, input: { sameAsPrimary: true } | { sameAsPrimary: false; wallet: WalletInput | null }) {
  const state = slots(user)
  if (input.sameAsPrimary) {
    if (!state.primary) throw new MockHttpError('VALIDATION', 'Cadastre a carteira principal primeiro.', { sameAsPrimary: 'Sem carteira principal.' })
    state.secondarySameAsPrimary = true
    state.secondary = null
  } else if (input.wallet === null) {
    state.secondarySameAsPrimary = false
  } else {
    assertUniqueAddress(user, 'secondary', input.wallet.address)
    state.secondarySameAsPrimary = false
    state.secondary = { ...input.wallet, id: state.secondary?.id ?? nextId('w'), slot: 'secondary', updatedAt: new Date().toISOString() }
  }
  persist()
  return getWallets(user)
}

export function connectWallet(user: UserRecord, input: WalletConnectionInput): WalletConnection {
  const state = getWallets(user)
  const wallet = [state.primary, state.secondary].find((candidate) => candidate?.id === input.walletId)
  if (!wallet) throw new MockHttpError('NOT_FOUND', 'Carteira não encontrada.')
  // WalletConnect can bridge any wallet; the other providers only connect their own wallet type.
  if (input.provider !== 'walletconnect' && wallet.provider !== input.provider) {
    throw new MockHttpError('VALIDATION', 'Provedor não corresponde à carteira.', { provider: 'Provedor inválido.' })
  }
  const connection = {
    id: nextId('conn'),
    userId: user.id,
    walletId: wallet.id,
    provider: input.provider,
    network: input.network,
    address: wallet.address,
    connectedAt: new Date().toISOString(),
  }
  db.connections[connection.id] = connection
  persist()
  const { userId: _userId, ...publicView } = connection
  return publicView
}

export function disconnectWallet(user: UserRecord, connectionId: string) {
  const connection = db.connections[connectionId]
  if (!connection || connection.userId !== user.id) throw new MockHttpError('NOT_FOUND', 'Conexão não encontrada.')
  delete db.connections[connectionId]
  persist()
}
