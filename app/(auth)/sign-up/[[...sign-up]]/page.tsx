import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple rounded-xl flex items-center justify-center text-white font-bold text-lg">N</div>
          <span className="text-2xl font-semibold text-text-primary">NextFlow</span>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "shadow-none",
              card: "bg-bg-secondary border border-border-secondary rounded-2xl shadow-2xl",
              headerTitle: "text-text-primary",
              headerSubtitle: "text-text-secondary",
              socialButtonsBlockButton: "bg-bg-tertiary border-border-primary text-text-primary hover:bg-bg-hover",
              dividerLine: "bg-border-primary",
              dividerText: "text-text-muted",
              formFieldLabel: "text-text-secondary",
              formFieldInput: "bg-bg-tertiary border-border-primary text-text-primary focus:border-purple",
              formButtonPrimary: "bg-purple hover:bg-purple-dark",
              footerActionLink: "text-purple hover:text-purple-light",
            },
          }}
        />
      </div>
    </div>
  );
}
