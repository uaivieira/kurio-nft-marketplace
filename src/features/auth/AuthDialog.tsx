import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { login, signup } from '@/api/auth'
import { loginInput, signupInput, type LoginInput, type SignupInput } from '@/contracts/auth'
import { applyApiErrors } from '@/components/form/api-errors'
import { Field, PasswordInput } from '@/components/form/Field'
import { FacebookLogoIcon, GoogleLogoIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { startSession } from '@/lib/auth-flow'
import { safeRedirect } from '@/lib/redirect'
import { cn } from '@/lib/utils'
import { announce } from '@/realtime/announcer'
import { useState } from 'react'

interface AuthDialogProps {
  mode: 'login' | 'signup'
  redirect?: string
  expired?: boolean
}

function SocialButtons() {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <p className="relative text-center text-xs before:absolute before:top-1/2 before:left-0 before:h-px before:w-full before:bg-border">
        <span className="relative bg-card px-3">{t('auth.social.divider')}</span>
      </p>
      {[
        { provider: 'Google', icon: <GoogleLogoIcon className="size-5" /> },
        { provider: 'Facebook', icon: <FacebookLogoIcon className="size-5" /> },
      ].map(({ provider, icon }) => (
        <button
          key={provider}
          type="button"
          disabled
          title={t('auth.social.unavailable')}
          className="flex h-10 w-full cursor-not-allowed items-center justify-center gap-3 rounded-sm border border-border text-xs font-bold text-muted-foreground max-md:first-of-type:mb-4"
        >
          {icon}
          {t('auth.social.continueWith', { provider })}
          <span className="sr-only">{` ${t('auth.social.unavailableSr')}`}</span>
        </button>
      ))}
    </div>
  )
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginInput>({ resolver: zodResolver(loginInput), defaultValues: { email: '', password: '' } })
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (session) => {
      await startSession(session)
      announce(t('realtime.loggedIn', { name: session.user.displayName }))
      onDone()
    },
    onError: (error) => setFormError(applyApiErrors(form, error)),
  })
  const { errors } = form.formState

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => { setFormError(null); mutation.mutate(values) })} className="space-y-4 max-md:space-y-3">
      {formError && <p role="alert" className="rounded-sm border border-destructive px-3 py-2 text-xs text-destructive">{formError}</p>}
      <Field hideLabel label={t('common.fields.email')} error={errors.email?.message}>
        {(props) => <Input {...props} className="max-md:h-[50px] max-md:rounded-lg" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} {...form.register('email')} />}
      </Field>
      <Field hideLabel label={t('common.fields.password')} error={errors.password?.message}>
        {(props) => <PasswordInput {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="current-password" placeholder={t('common.fields.password')} {...form.register('password')} />}
      </Field>
      <p className="text-right text-sm max-md:mb-[38px]">
        <span aria-disabled="true" title={t('common.soon')} className="cursor-not-allowed text-highlight/70">{t('auth.forgotPassword')}<span className="sr-only">{` ${t('common.soonSr')}`}</span></span>
      </p>
      <Button type="submit" size="lg" className="w-full max-md:h-[60px] max-md:rounded-lg" disabled={mutation.isPending}>
        {mutation.isPending ? t('auth.loggingIn') : t('auth.login')}
      </Button>
    </form>
  )
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SignupInput>({ resolver: zodResolver(signupInput), defaultValues: { username: '', email: '', password: '', confirmPassword: '' } })
  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: async (session) => {
      await startSession(session)
      announce(t('realtime.signedUp', { name: session.user.displayName }))
      onDone()
    },
    onError: (error) => setFormError(applyApiErrors(form, error)),
  })
  const { errors } = form.formState

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => { setFormError(null); mutation.mutate(values) })} className="space-y-3">
      {formError && <p role="alert" className="rounded-sm border border-destructive px-3 py-2 text-xs text-destructive">{formError}</p>}
      <Field hideLabel label={t('common.fields.username')} error={errors.username?.message}>
        {(props) => <Input {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="username" placeholder={t('common.fields.username')} {...form.register('username')} />}
      </Field>
      <Field hideLabel label={t('common.fields.email')} error={errors.email?.message}>
        {(props) => <Input {...props} className="max-md:h-[50px] max-md:rounded-lg" type="email" autoComplete="email" placeholder={t('auth.signupEmailPlaceholder')} {...form.register('email')} />}
      </Field>
      <Field hideLabel label={t('common.fields.password')} error={errors.password?.message}>
        {(props) => <PasswordInput {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="new-password" placeholder={t('common.fields.password')} {...form.register('password')} />}
      </Field>
      <Field hideLabel label={t('common.fields.confirmPassword')} error={errors.confirmPassword?.message}>
        {(props) => <PasswordInput {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="new-password" placeholder={t('common.fields.confirmPassword')} {...form.register('confirmPassword')} />}
      </Field>
      <Button type="submit" size="lg" className="mt-2 w-full max-md:mt-7 max-md:h-[60px] max-md:rounded-lg" disabled={mutation.isPending}>
        {mutation.isPending ? t('auth.signingUp') : (<><span className="md:hidden">{t('auth.signupMobile')}</span><span className="max-md:hidden">{t('auth.signup')}</span></>)}
      </Button>
    </form>
  )
}

export function AuthDialog({ mode, redirect, expired }: AuthDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const destination = safeRedirect(redirect)
  const leave = () => void navigate({ href: destination })
  const isLogin = mode === 'login'

  return (
    <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
      <DialogContent
        className="max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:[align-content:safe_center] max-md:overflow-y-auto max-md:px-7 max-md:rounded-none max-md:border-b-0 max-md:bg-background md:top-[158px] md:max-w-[500px] md:translate-y-0 md:gap-5 md:px-0 md:pt-12 md:pb-14"
        aria-describedby="auth-description"
        overlayClassName="md:bg-transparent"
      >
        <p aria-hidden="true" className="hidden pt-3.5 text-center text-3xl font-bold tracking-label max-md:block">KURIO</p>
        <p aria-hidden="true" className="hidden pt-[68px] pb-4 text-center text-xl font-bold max-md:block">{isLogin ? t('auth.login') : t('auth.signupMobileTitle')}</p>
        <div className="flex items-center justify-center gap-3 text-xl max-md:hidden">
          <DialogTitle className="sr-only">{isLogin ? t('auth.login') : t('auth.signup')}</DialogTitle>
          <Link to="/login" search={{ redirect }} replace aria-current={isLogin ? 'page' : undefined} className={cn(isLogin ? 'font-bold text-highlight' : 'font-bold')}>{t('auth.login')}</Link>
          <span aria-hidden="true" className="h-5 w-px bg-primary" />
          <Link to="/signup" search={{ redirect }} replace aria-current={!isLogin ? 'page' : undefined} className={cn(!isLogin ? 'font-bold text-highlight' : 'font-bold')}>{t('auth.signup')}</Link>
        </div>
        <DialogDescription id="auth-description" className="mx-auto max-w-[360px] text-center text-sm text-foreground max-md:sr-only">
          {isLogin ? t('auth.loginDescription') : t('auth.signupDescription')}
        </DialogDescription>
        {expired && <p role="status" className="rounded-sm border border-primary px-3 py-2 text-center text-xs">{t('auth.expired')}</p>}
        <div className="mx-auto w-full max-w-[340px] space-y-5 max-md:max-w-none max-md:space-y-10">
          {isLogin ? <LoginForm onDone={leave} /> : <SignupForm onDone={leave} />}
          <SocialButtons />
          <p className="text-center text-base text-text-secondary md:hidden">
            {isLogin ? (
              <Link to="/signup" search={{ redirect }} replace className="hover:text-highlight">{t('auth.toSignup')}</Link>
            ) : (
              <Link to="/login" search={{ redirect }} replace className="hover:text-highlight">{t('auth.toLogin')}</Link>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
