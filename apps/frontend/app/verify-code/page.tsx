import VerifyCode from "../../src/components/auth/VerifyCode";

export const metadata = {
  title: "Vérification de sécurité | StockMaster Pro",
  description: "Entrez le code de vérification pour sécuriser votre session.",
};

export default function VerifyCodePage() {
  return <VerifyCode />;
}