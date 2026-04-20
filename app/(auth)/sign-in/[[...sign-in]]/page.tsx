import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0a0a0a",
      gap: "32px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{
          width: "44px",
          height: "44px",
          backgroundColor: "#8b5cf6",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "700",
          fontSize: "20px",
          fontFamily: "sans-serif",
        }}>
          N
        </div>
        <span style={{
          fontSize: "24px",
          fontWeight: "600",
          color: "white",
          fontFamily: "sans-serif",
        }}>
          NextFlow
        </span>
      </div>

      <SignIn
        appearance={{
          variables: {
            colorBackground: "#111111",
            colorText: "#e0e0e0",
            colorTextSecondary: "#aaaaaa",
            colorPrimary: "#8b5cf6",
            colorInputBackground: "#1a1a1a",
            colorInputText: "#e0e0e0",
            borderRadius: "10px",
          },
        }}
      />
    </main>
  );
}