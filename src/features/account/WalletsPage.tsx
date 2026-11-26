import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { notify } from '@/lib/notify'
import { applyApiErrors } from '@/components/form/api-errors'
import { Field } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { NETWORK_LABELS, NETWORKS, WALLET_PROVIDER_LABELS, WALLET_PROVIDERS } from '@/contracts/common'
import { ENS_SUFFIXES } from '@/contracts/profile'
import { walletFields, type Wallet, type WalletInput } from '@/contracts/wallet'
import { errorMessage } from '@/lib/api-error'
import { announce } from '@/realtime/announcer'
import { useSavePrimaryWallet, useSaveSecondaryWallet, useWallets } from '@/queries/account'

const EMPTY: Partial<WalletInput> = { displayName: '', nickname: '', profileName: '', address: '', secondaryAddress: '', referralCode: '', email: '', ensLabel: '', ensSuffix: '.eth' }

function WalletForm({ idPrefix, wallet, onSave, saving }: { idPrefix: string; wallet: Wallet | null; onSave: (values: WalletInput) => Promise<unknown>; saving: boolean }) {
  const { t } = useTranslation()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<WalletInput>({ resolver: zodResolver(walletFields), defaultValues: EMPTY as WalletInput })
  const { errors } = form.formState

  useEffect(() => {
    if (wallet) {
      const { id: _id, slot: _slot, updatedAt: _updatedAt, ...values } = wallet
      form.reset(values)
    }
  }, [wallet, form])

  return (
    <form id={idPrefix} noValidate className="space-y-4" onSubmit={form.handleSubmit(async (values) => {
      setFormError(null)
      try {
        await onSave(values)
      } catch (error) {
        setFormError(applyApiErrors(form, error))
      }
    })}>
      {formError && <p role="alert" className="rounded-sm border border-destructive px-3 py-2 text-xs text-destructive">{formError}</p>}
      <div className="grid gap-x-7 gap-y-6 lg:grid-cols-2 lg:gap-y-[30px] lg:[&>div]:gap-[3px]">
        <Field label={t('common.fields.displayName')} required error={errors.displayName?.message}>{(p) => <Input {...p} {...form.register('displayName')} />}</Field>
        <Field label={t('common.fields.walletNickname')} required error={errors.nickname?.message}>{(p) => <Input {...p} {...form.register('nickname')} />}</Field>
        <Field label={t('common.fields.network')} required error={errors.network?.message}>
          {(p) => (
            <Controller control={form.control} name="network" render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger {...p}><SelectValue placeholder={t('common.fields.selectNetwork')} /></SelectTrigger>
                <SelectContent>{NETWORKS.map((value) => <SelectItem key={value} value={value}>{NETWORK_LABELS[value]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          )}
        </Field>
        <Field label={t('common.fields.profileName')} required error={errors.profileName?.message}>{(p) => <Input {...p} {...form.register('profileName')} />}</Field>
        <Field label={t('common.fields.walletAddress')} required error={errors.address?.message}>{(p) => <Input {...p} placeholder={t('common.fields.walletAddressPlaceholder')} autoComplete="off" {...form.register('address')} />}</Field>
        <Field label={t('account.walletsPage.secondaryAddress')} error={errors.secondaryAddress?.message}>{(p) => <Input {...p} placeholder={t('account.walletsPage.secondaryAddress')} autoComplete="off" {...form.register('secondaryAddress')} />}</Field>
        <Field label={t('common.fields.walletType')} required error={errors.provider?.message}>
          {(p) => (
            <Controller control={form.control} name="provider" render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger {...p}><SelectValue placeholder={t('common.fields.selectWallet')} /></SelectTrigger>
                <SelectContent>{WALLET_PROVIDERS.map((value) => <SelectItem key={value} value={value}>{WALLET_PROVIDER_LABELS[value]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          )}
        </Field>
        <Field label={t('common.fields.referralCode')} required error={errors.referralCode?.message}>{(p) => <Input {...p} {...form.register('referralCode')} />}</Field>
        <Field label={t('common.fields.email')} required error={errors.email?.message}>{(p) => <Input {...p} type="email" {...form.register('email')} />}</Field>
        <Field label={t('common.fields.ensName')} required error={errors.ensLabel?.message}>
          {(p) => (
            <div className="flex gap-2 md:gap-2.5">
              <Controller control={form.control} name="ensSuffix" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label={t('common.fields.ensSuffix')} className="w-24 md:w-[78px] md:pl-2.5 md:text-md"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENS_SUFFIXES.map((suffix) => <SelectItem key={suffix} value={suffix}>{suffix}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              <Input {...p} {...form.register('ensLabel')} />
            </div>
          )}
        </Field>
      </div>
      <Button type="submit" disabled={saving} className="lg:mt-4 lg:w-[131px] lg:px-0">{saving ? t('common.saving') : t('account.walletsPage.submit')}</Button>
    </form>
  )
}

export function WalletsPage() {
  const { t } = useTranslation()
  const wallets = useWallets()
  const savePrimary = useSavePrimaryWallet()
  const saveSecondary = useSaveSecondaryWallet()
  const [addingSecondary, setAddingSecondary] = useState(false)

  if (wallets.isPending) {
    return <div role="status" aria-busy="true" aria-label={t('account.walletsPage.loading')} className="grid gap-4 lg:grid-cols-2" data-testid="wallets-skeleton">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
  }
  if (wallets.isError) {
    return <div role="alert" className="space-y-3"><p>{errorMessage(wallets.error)}</p><Button onClick={() => void wallets.refetch()}>{t('common.tryAgain')}</Button></div>
  }

  const { primary, secondary, secondarySameAsPrimary } = wallets.data
  const showSecondaryForm = !secondarySameAsPrimary && (secondary !== null || addingSecondary)
  const saved = (message: string) => { notify.success(message); announce(message) }

  return (
    <div className="space-y-10 lg:space-y-[27px]">
      <section aria-labelledby="primary-title">
        <h1 id="primary-title" className="text-base font-bold lg:text-[17px]">{t('account.walletsPage.primaryTitle')}</h1>
        <p className="mt-1 mb-5 text-xs text-muted-foreground lg:mt-0 lg:mb-[35.5px] lg:text-sm lg:text-text-secondary">{t('account.walletsPage.primaryText')}</p>
        <WalletForm idPrefix="primary-wallet" wallet={primary} saving={savePrimary.isPending} onSave={(values) => savePrimary.mutateAsync(values).then(() => saved(t('account.walletsPage.primarySaved')))} />
      </section>

      <section aria-labelledby="secondary-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="secondary-title" className="text-base font-bold lg:text-[17px]">{t('account.walletsPage.secondaryTitle')}</h2>
          <div className="flex items-center gap-4 text-xs lg:gap-[8.5px] lg:text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                className="lg:rounded-full lg:border-[1.5px] lg:border-primary"
                checked={secondarySameAsPrimary}
                disabled={!primary || saveSecondary.isPending}
                onCheckedChange={(checked) => saveSecondary.mutate(checked === true ? { sameAsPrimary: true } : { sameAsPrimary: false, wallet: null }, { onSuccess: () => saved(checked ? t('account.walletsPage.linked') : t('account.walletsPage.unlinked')), onError: (e) => notify.error(errorMessage(e)) })}
              />
              {t('account.walletsPage.sameAsPrimary')}
            </label>
            {!secondary && !secondarySameAsPrimary && !addingSecondary && (
              <button type="button" onClick={() => setAddingSecondary(true)} className="cursor-pointer text-base font-bold text-highlight lg:font-medium">{t('common.add')}</button>
            )}
          </div>
        </div>
        {secondarySameAsPrimary ? (
          <p className="mt-2 text-xs text-muted-foreground" data-testid="secondary-same">{t('account.walletsPage.sameNote')}</p>
        ) : showSecondaryForm ? (
          <div className="mt-5">
            <WalletForm idPrefix="secondary-wallet" wallet={secondary} saving={saveSecondary.isPending} onSave={(values) => saveSecondary.mutateAsync({ sameAsPrimary: false, wallet: values }).then(() => { saved(t('account.walletsPage.secondarySaved')); setAddingSecondary(false) })} />
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{t('account.walletsPage.noSecondary')}</p>
        )}
      </section>
    </div>
  )
}
