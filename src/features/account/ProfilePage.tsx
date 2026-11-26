import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon } from '@/components/icons'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { notify } from '@/lib/notify'
import { applyApiErrors } from '@/components/form/api-errors'
import { Field, PasswordInput } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AVATAR_TYPES, ENS_SUFFIXES, MAX_AVATAR_BYTES, passwordInput, profileInput, type PasswordInput as PasswordValues, type ProfileInput } from '@/contracts/profile'
import { errorMessage } from '@/lib/api-error'
import { announce } from '@/realtime/announcer'
import { useChangePassword, useProfile, useUpdateAvatar, useUpdateProfile } from '@/queries/account'

function Avatar() {
  const { t } = useTranslation()
  const { data } = useProfile()
  const update = useUpdateAvatar()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return setError(t('account.avatar.invalidType'))
    if (file.size > MAX_AVATAR_BYTES) return setError(t('account.avatar.tooLarge'))
    const reader = new FileReader()
    reader.onload = () =>
      update.mutate({ dataUrl: String(reader.result) }, { onSuccess: () => { notify.success(t('account.avatar.updated')); announce(t('account.avatar.updated')) }, onError: (e) => setError(errorMessage(e)) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-2 lg:-mt-[7px] lg:gap-2.5!">
      <span id="avatar-label" className="text-md leading-4">{t('account.avatar.label')}</span>
      <div className="flex items-center gap-4 md:gap-6">
        <span className="flex size-12 items-center justify-center overflow-hidden rounded-full border border-border bg-elevated md:size-[50px]">
          {data?.avatarUrl ? <img src={data.avatarUrl} alt={t('account.avatar.alt')} className="size-full object-cover" data-testid="avatar-image" /> : <ImageIcon className="size-5 text-primary" aria-hidden="true" />}
        </span>
        <input ref={input} type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" aria-labelledby="avatar-label" tabIndex={-1} data-testid="avatar-input" onChange={(event) => { pick(event.target.files?.[0]); event.target.value = '' }} />
        <Button type="button" size="sm" disabled={update.isPending} onClick={() => input.current?.click()} className="md:h-10 md:w-[98px] md:justify-start md:pl-[25px] md:text-sm">{t('account.avatar.change')}</Button>
        <Button type="button" variant="ghost" size="sm" className="md:-ml-3.5 md:px-2.5 md:text-sm md:font-normal" disabled={update.isPending || !data?.avatarUrl} onClick={() => update.mutate({ dataUrl: null }, { onSuccess: () => announce(t('realtime.avatarRemoved')), onError: (e) => setError(errorMessage(e)) })}>{t('common.remove')}</Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ProfileForm() {
  const { t } = useTranslation()
  const { data } = useProfile()
  const update = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileInput) })
  const { errors } = form.formState

  useEffect(() => {
    if (data) form.reset({ displayName: data.displayName, username: data.username, email: data.email, ensLabel: data.ensLabel, ensSuffix: data.ensSuffix, walletNickname: data.walletNickname })
  }, [data, form])

  return (
    <form noValidate className="space-y-4" onSubmit={form.handleSubmit((values) => {
      setFormError(null)
      update.mutate(values, {
        onSuccess: () => { notify.success(t('account.profile.saved')); announce(t('realtime.profileSaved')) },
        onError: (error) => setFormError(applyApiErrors(form, error)),
      })
    })}>
      {formError && <p role="alert" className="rounded-sm border border-destructive px-3 py-2 text-xs text-destructive">{formError}</p>}
      <div className="grid gap-x-7 gap-y-6 lg:grid-cols-2 lg:gap-y-[30px] lg:[&>div]:gap-[17px]">
        <Field label={t('common.fields.displayName')} required error={errors.displayName?.message}>{(p) => <Input {...p} {...form.register('displayName')} />}</Field>
        <Field label={t('common.fields.username')} required error={errors.username?.message}>{(p) => <Input {...p} autoComplete="username" {...form.register('username')} />}</Field>
        <Field label={t('common.fields.email')} required error={errors.email?.message}>{(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}</Field>
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
        <Field label={t('common.fields.walletNickname')} required error={errors.walletNickname?.message}>{(p) => <Input {...p} {...form.register('walletNickname')} />}</Field>
        <Avatar />
      </div>
      <Button type="submit" disabled={update.isPending} className="md:w-[131px]">{update.isPending ? t('common.saving') : t('common.save')}</Button>
    </form>
  )
}

function PasswordForm() {
  const { t } = useTranslation()
  const change = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordInput), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } })
  const { errors } = form.formState

  return (
    <form noValidate className="max-w-[417px] space-y-4" onSubmit={form.handleSubmit((values) => {
      setFormError(null)
      change.mutate(values, {
        onSuccess: () => { form.reset(); notify.success(t('account.password.changed')); announce(t('realtime.passwordChanged')) },
        onError: (error) => setFormError(applyApiErrors(form, error)),
      })
    })}>
      {formError && <p role="alert" className="rounded-sm border border-destructive px-3 py-2 text-xs text-destructive">{formError}</p>}
      <Field label={t('account.password.current')} error={errors.currentPassword?.message}>{(p) => <PasswordInput {...p} autoComplete="current-password" {...form.register('currentPassword')} />}</Field>
      <Field label={t('account.password.new')} error={errors.newPassword?.message}>{(p) => <PasswordInput {...p} autoComplete="new-password" {...form.register('newPassword')} />}</Field>
      <Field label={t('account.password.confirm')} error={errors.confirmPassword?.message}>{(p) => <PasswordInput {...p} autoComplete="new-password" {...form.register('confirmPassword')} />}</Field>
      <Button type="submit" disabled={change.isPending}>{change.isPending ? t('account.password.changing') : t('account.password.submit')}</Button>
    </form>
  )
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { isPending, isError, error, refetch } = useProfile()
  return (
    <div className="space-y-10">
      <section aria-labelledby="profile-title">
        <h1 id="profile-title" className="mb-4 text-base font-bold lg:mb-[34px]">{t('account.profile.title')}</h1>
        {isPending ? (
          <div role="status" aria-busy="true" aria-label={t('account.profile.loading')} className="grid gap-4 lg:grid-cols-2" data-testid="profile-skeleton">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : isError ? (
          <div role="alert" className="space-y-3"><p>{errorMessage(error)}</p><Button onClick={() => void refetch()}>{t('common.tryAgain')}</Button></div>
        ) : (
          <ProfileForm />
        )}
      </section>
      <section aria-labelledby="password-title">
        <h2 id="password-title" className="mb-4 text-base font-medium">{t('account.password.title')}</h2>
        <PasswordForm />
      </section>
    </div>
  )
}
