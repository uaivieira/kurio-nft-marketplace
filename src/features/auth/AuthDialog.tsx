import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { login, signup } from '@/api/auth'
import { loginInput, signupInput, type LoginInput, type SignupInput } from '@/contracts/auth'
import { applyApiErrors } from '@/components/form/api-errors'
import { Field, PasswordInput } from '@/components/form/Field'
import { FacebookIcon, GoogleIcon } from '@/components/icons'
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
  return (
    <div className="space-y-3">
      <p className="relative text-center text-xs before:absolute before:top-1/2 before:left-0 before:h-px before:w-full before:bg-border">
        <span className="relative bg-card px-3">Ou continue com</span>
      </p>
      {[
        { provider: 'Google', icon: <GoogleIcon className="size-[18px] text-[#4285F4]" /> },
        { provider: 'Facebook', icon: <FacebookIcon className="size-[18px] text-[#1877F2]" /> },
      ].map(({ provider, icon }) => (
        <button
          key={provider}
          type="button"
          disabled
          title="Indisponível nesta demonstração"
          className="flex h-10 w-full cursor-not-allowed items-center justify-center gap-3 rounded-sm border border-border text-xs font-bold text-muted-foreground"
        >
          {icon}
          Continuar com {provider}
          <span className="sr-only"> (indisponível nesta demonstração)</span>
        </button>
      ))}
    </div>
  )
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginInput>({ resolver: zodResolver(loginInput), defaultValues: { email: '', password: '' } })
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (session) => {
      await startSession(session)
      announce(`Login realizado. Bem-vindo, ${session.user.displayName}.`)
      onDone()
    },
    onError: (error) => setFormError(applyApiErrors(form, error)),
  })
  const { errors } = form.formState

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => { setFormError(null); mutation.mutate(values) })} className="space-y-4">
      {formError && <p role="alert" className="rounded-sm border border-destructive px-3 py-2 text-xs text-destructive">{formError}</p>}
      <Field hideLabel label="E-mail" error={errors.email?.message}>
        {(props) => <Input {...props} className="max-md:h-[50px] max-md:rounded-lg" type="email" autoComplete="email" placeholder="contato@email.com" {...form.register('email')} />}
      </Field>
      <Field hideLabel label="Senha" error={errors.password?.message}>
        {(props) => <PasswordInput {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="current-password" placeholder="Senha" {...form.register('password')} />}
      </Field>
      <p className="text-right text-xs">
        <span aria-disabled="true" title="Em breve" className="cursor-not-allowed text-highlight/70">Esqueceu a senha?<span className="sr-only"> (em breve)</span></span>
      </p>
      <Button type="submit" size="lg" className="w-full max-md:h-[60px] max-md:rounded-lg" disabled={mutation.isPending}>
        {mutation.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SignupInput>({ resolver: zodResolver(signupInput), defaultValues: { username: '', email: '', password: '', confirmPassword: '' } })
  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: async (session) => {
      await startSession(session)
      announce(`Conta criada. Bem-vindo, ${session.user.displayName}.`)
      onDone()
    },
    onError: (error) => setFormError(applyApiErrors(form, error)),
  })
  const { errors } = form.formState

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => { setFormError(null); mutation.mutate(values) })} className="space-y-3">
      {formError && <p role="alert" className="rounded-sm border border-destructive px-3 py-2 text-xs text-destructive">{formError}</p>}
      <Field hideLabel label="Nome de usuário" error={errors.username?.message}>
        {(props) => <Input {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="username" placeholder="Nome de usuário" {...form.register('username')} />}
      </Field>
      <Field hideLabel label="E-mail" error={errors.email?.message}>
        {(props) => <Input {...props} className="max-md:h-[50px] max-md:rounded-lg" type="email" autoComplete="email" placeholder="Digite seu e-mail" {...form.register('email')} />}
      </Field>
      <Field hideLabel label="Senha" error={errors.password?.message}>
        {(props) => <PasswordInput {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="new-password" placeholder="Senha" {...form.register('password')} />}
      </Field>
      <Field hideLabel label="Confirmar senha" error={errors.confirmPassword?.message}>
        {(props) => <PasswordInput {...props} className="max-md:h-[50px] max-md:rounded-lg" autoComplete="new-password" placeholder="Confirmar senha" {...form.register('confirmPassword')} />}
      </Field>
      <Button type="submit" size="lg" className="mt-2 w-full max-md:h-[60px] max-md:rounded-lg" disabled={mutation.isPending}>
        {mutation.isPending ? 'Criando conta…' : (<><span className="md:hidden">Criar perfil</span><span className="max-md:hidden">Criar conta</span></>)}
      </Button>
    </form>
  )
}

/** Modal over the home page on desktop (as in the Figma); full screen on mobile. */
export function AuthDialog({ mode, redirect, expired }: AuthDialogProps) {
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
        <p aria-hidden="true" className="hidden text-center text-3xl font-bold tracking-label max-md:block">KURIO</p>
        <p aria-hidden="true" className="hidden pt-16 pb-4 text-center text-xl font-bold max-md:block">{isLogin ? 'Entrar' : 'Criar perfil de colecionador'}</p>
        <div className="flex items-center justify-center gap-3 text-xl max-md:hidden">
          <DialogTitle className="sr-only">{isLogin ? 'Entrar' : 'Criar conta'}</DialogTitle>
          <Link to="/login" search={{ redirect }} replace aria-current={isLogin ? 'page' : undefined} className={cn(isLogin ? 'font-bold text-highlight' : 'font-bold')}>Entrar</Link>
          <span aria-hidden="true" className="h-5 w-px bg-primary" />
          <Link to="/signup" search={{ redirect }} replace aria-current={!isLogin ? 'page' : undefined} className={cn(!isLogin ? 'font-bold text-highlight' : 'font-bold')}>Criar conta</Link>
        </div>
        <DialogDescription id="auth-description" className="mx-auto max-w-[360px] text-center text-sm text-foreground max-md:sr-only">
          {isLogin ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.' : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </DialogDescription>
        {expired && <p role="status" className="rounded-sm border border-primary px-3 py-2 text-center text-xs">Sua sessão expirou. Entre novamente para retomar de onde parou.</p>}
        <div className="mx-auto w-full max-w-[340px] space-y-5 max-md:max-w-none">
          {isLogin ? <LoginForm onDone={leave} /> : <SignupForm onDone={leave} />}
          <SocialButtons />
          <p className="pt-6 text-center text-base text-text-secondary md:hidden">
            {isLogin ? (
              <Link to="/signup" search={{ redirect }} replace className="hover:text-highlight">Novo na Kurio? Crie uma conta</Link>
            ) : (
              <Link to="/login" search={{ redirect }} replace className="hover:text-highlight">Já tem uma conta? Entre</Link>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
