export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, loginWithGoogle, loginWithFacebook, error: authError, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as any,
    },
  });

  const watchedPassword = watch('password', '');
  const passwordRules = [
    { label: '8+ Characters', met: watchedPassword.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(watchedPassword) },
    { label: 'Lowercase', met: /[a-z]/.test(watchedPassword) },
    { label: 'Digit', met: /[0-9]/.test(watchedPassword) },
  ];

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await registerUser(data.email, data.password, data.fullName);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setToast({ message: 'Email already registered. Try logging in.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    clearError();
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithFacebook();
      router.push('/dashboard');
    } catch {
      // Error is set via AuthContext
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex flex-col">
       {/* ─── Toast Notification ─── */}
       {toast && (
        <div className="fixed top-8 right-8 z-50 flex items-center gap-4 bg-pw-black text-white px-6 py-4 rounded-[32px] shadow-2xl animate-in slide-in-from-right-8 duration-500">
           <AlertCircle className="w-5 h-5 text-red-500" />
           <p className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</p>
           <button onClick={() => setToast(null)} className="ml-4 opacity-40 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-tighter text-pw-black">Secure Onboarding.</h1>
        <p className="mt-4 text-sm text-pw-muted font-normal">
          Initialize your institutional identity.
        </p>
      </div>

      {/* ─── Error State ─── */}
      {authError && (
        <div className="mb-8 p-4 bg-pw-black text-white rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed uppercase tracking-wider">{authError}</p>
        </div>
      )}

      {/* ─── Social SSO Stack ─── */}
      <div className="flex items-center gap-3 mb-10">
        <button
          type="button"
          onClick={() => handleSocialRegister('google')}
          disabled={!!loadingProvider || isSubmitting}
          className="flex-1 flex items-center justify-center h-14 bg-pw-bg hover:bg-pw-border/20 border border-pw-border/10 rounded-full transition-all duration-300 group"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="w-5 h-5 animate-spin text-pw-black" />
          ) : (
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSocialRegister('facebook')}
          disabled={!!loadingProvider || isSubmitting}
          className="flex-1 flex items-center justify-center h-14 bg-pw-bg hover:bg-pw-border/20 border border-pw-border/10 rounded-full transition-all duration-300 group"
        >
          {loadingProvider === 'facebook' ? (
            <Loader2 className="w-5 h-5 animate-spin text-pw-black" />
          ) : (
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.384C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
        </button>
      </div>

       {/* ─── Divider ─── */}
       <div className="relative mb-8 flex items-center gap-4">
        <div className="flex-1 h-[1px] bg-pw-border/10" />
        <p className="ag-label opacity-40 uppercase tracking-widest text-[9px] font-bold">Registration protocols</p>
        <div className="flex-1 h-[1px] bg-pw-border/10" />
      </div>

      {/* ─── Registration Form ─── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="ag-label mb-3 block opacity-60">Full Identity</label>
          <div className="relative group">
            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted group-hover:text-pw-black transition-colors" />
            <input
              type="text"
              {...register('fullName')}
              placeholder="Legal Full Name"
              className="w-full h-14 bg-pw-bg/30 border border-pw-border/10 rounded-full pl-14 pr-6 text-sm font-medium focus:bg-pw-surface focus:border-pw-black transition-all outline-none"
            />
          </div>
          {errors.fullName && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="ag-label mb-3 block opacity-60">Professional Email</label>
          <div className="relative group">
            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted group-hover:text-pw-black transition-colors" />
            <input
              type="email"
              {...register('email')}
              placeholder="direct@firm.com"
              className="w-full h-14 bg-pw-bg/30 border border-pw-border/10 rounded-full pl-14 pr-6 text-sm font-medium focus:bg-pw-surface focus:border-pw-black transition-all outline-none"
            />
          </div>
          {errors.email && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="ag-label mb-3 block opacity-60">Authentication Secret</label>
          <div className="relative group">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted group-hover:text-pw-black transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Complexity Required"
              className="w-full h-14 bg-pw-bg/30 border border-pw-border/10 rounded-full pl-14 pr-14 text-sm font-medium focus:bg-pw-surface focus:border-pw-black transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-black transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
           {/* Strength Matrix */}
           {watchedPassword.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-6">
              {passwordRules.map((rule) => (
                <div key={rule.label} className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-opacity duration-300 ${rule.met ? 'text-pw-black opacity-100' : 'text-pw-muted opacity-30'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {rule.label}
                </div>
              ))}
            </div>
          )}
          {errors.password && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="ag-label mb-3 block opacity-60">Validate Security Key</label>
          <div className="relative group">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted group-hover:text-pw-black transition-colors" />
            <input
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Repeat Secret"
              className="w-full h-14 bg-pw-bg/30 border border-pw-border/10 rounded-full pl-14 pr-14 text-sm font-medium focus:bg-pw-surface focus:border-pw-black transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-black transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.confirmPassword.message}</p>}
        </div>

        {/* Terms Protocol */}
        <div className="flex items-start gap-4 px-6 py-2 group">
          <div className="relative flex items-center h-5">
            <input
              type="checkbox"
              {...register('acceptTerms')}
              className="w-5 h-5 border-2 border-pw-border rounded cursor-pointer accent-pw-black"
            />
          </div>
          <p className="text-[10px] font-medium text-pw-muted leading-tight leading-loose">
            By initializing account, I confirm adherence to 
            <Link href="/terms" className="text-pw-black underline decoration-pw-border/30 underline-offset-4 ml-1">Governance Protocols</Link> & 
            <Link href="/privacy" className="text-pw-black underline decoration-pw-border/30 underline-offset-4 ml-1">Privacy Mandates</Link>.
          </p>
        </div>
        {errors.acceptTerms && <p className="ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.acceptTerms.message}</p>}

        {/* Finalize Action */}
        <button
          type="submit"
          disabled={isSubmitting || !!loadingProvider}
          className="w-full h-14 bg-pw-black text-white rounded-full font-bold uppercase tracking-[0.2em] text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 shadow-2xl"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Account'}
        </button>
      </form>

      {/* ─── Login Link Footer ─── */}
      <div className="mt-12 text-center pt-8 border-t border-pw-border/10">
        <p className="text-xs text-pw-muted">
          Existing credentials found?{' '}
          <Link href="/login" className="text-pw-black font-bold hover:underline transition-all">
            Authorize Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
