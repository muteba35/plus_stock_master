"use client";
import BrandLogo from "../../../src/components/BrandLogo";
export default function ShopLogo({ logo, className = "h-10 w-10", name = "Movoora" }: { logo?: string; className?: string; name?: string }) {
  if (!logo) return <BrandLogo compact className={className} />;
  return <img src={logo} alt={name} className={`${className} object-contain`} />;
}
