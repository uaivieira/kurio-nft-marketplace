import type { WalletConnection, WalletConnectionInput, WalletInput, WalletsState } from '@/contracts/wallet'
import { db, nextId, persist, type UserRecord, type WalletSlots } from '../db/state'
import { MockHttpError } from '../http'
import { validation } from '@/i18n/keys'

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
    throw new MockHttpError('CONFLICT', `Address is already registered as the ${slot === 'primary' ? 'secondary' : 'primary'} wallet.`, {
      address: validation('addressInOtherWallet'),
    }, { reason: slot === 'primary' ? 'walletIsSecondary' : 'walletIsPrimary' })
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
    if (!state.primary) throw new MockHttpError('VALIDATION', 'A primary wallet is required first.', { sameAsPrimary: validation('primaryWalletMissing') }, { reason: 'primaryWalletRequired' })
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
  if (!wallet) throw new MockHttpError('NOT_FOUND', 'Wallet not found.', undefined, { reason: 'wallet' })
  if (input.provider !== 'walletconnect' && wallet.provider !== input.provider) {
    throw new MockHttpError('VALIDATION', 'Provider does not match the wallet.', { provider: validation('providerInvalid') }, { reason: 'providerMismatch' })
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
  if (!connection || connection.userId !== user.id) throw new MockHttpError('NOT_FOUND', 'Connection not found.', undefined, { reason: 'connection' })
  delete db.connections[connectionId]
  persist()
}
